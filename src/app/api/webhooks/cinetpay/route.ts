import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Notifications CinetPay arrivent en form-data
    const headers = Object.fromEntries(request.headers)
    const xToken = headers['x-token'] as string | undefined
    const form = await request.formData()

    // Reconstitution de la chaîne d'HMAC EXACTE (ordre documenté)
    const orderedKeys = [
      'cpm_site_id',
      'cpm_trans_id',
      'cpm_trans_date',
      'cpm_amount',
      'cpm_currency',
      'signature',
      'payment_method',
      'cel_phone_num',
      'cpm_phone_prefixe',
      'cpm_language',
      'cpm_version',
      'cpm_payment_config',
      'cpm_page_action',
      'cpm_custom',
      'cpm_designation',
      'cpm_error_message',
    ]
    const concatenated = orderedKeys.map(k => String(form.get(k) ?? '')).join('')

    const computed = crypto
      .createHmac('sha256', process.env.CINETPAY_SECRET_KEY!)
      .update(concatenated, 'utf8')
      .digest('hex')

    if (!xToken || !crypto.timingSafeEqual(Buffer.from(xToken), Buffer.from(computed))) {
      return new NextResponse('invalid signature', { status: 401 })
    }

    const transactionId = String(form.get('cpm_trans_id') ?? '')
    if (!transactionId || transactionId.length > 128) {
      return new NextResponse('invalid transaction id', { status: 400 })
    }
    const admin = createAdminClient()
    // Récupérer la tentative (pour invoice_id et notify_count)
    const { data: attemptRow } = await admin
      .from('payment_attempts')
      .select('id, invoice_id, notify_count')
      .eq('transaction_id', transactionId)
      .maybeSingle()

    if (attemptRow) {
      await admin
        .from('payment_attempts')
        .update({ status: 'webhooked', notify_count: (attemptRow.notify_count ?? 0) + 1 })
        .eq('id', attemptRow.id)
    }

    // Vérification serveur obligatoire
    const checkRes = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: process.env.CINETPAY_APIKEY!,
        site_id: process.env.CINETPAY_SITE_ID!,
        transaction_id: transactionId,
      }),
    })
    const check = await checkRes.json()

    // Statut final
    const status = check?.data?.status as string | undefined
    const operatorId = check?.data?.operator_id as string | undefined
    const paymentMethod = check?.data?.payment_method as string | undefined
    const amount = Number(check?.data?.amount ?? 0)
    const currency = String(check?.data?.currency ?? 'XOF')

    if (!Number.isFinite(amount) || amount <= 0) {
      console.warn('webhook invalid amount', amount)
    }

    // Récupérer la tentative pour relier invoice_id
    const attempt = attemptRow

    if (!attempt?.invoice_id) {
      return NextResponse.json({ ok: false, reason: 'attempt_not_found' })
    }

    if (status === 'ACCEPTED') {
      // Idempotent: si payment déjà existant pour transaction_id, ne rien recréer
      const { data: existing } = await admin
        .from('payments')
        .select('id')
        .eq('cinetpay_transaction_id', transactionId)
        .maybeSingle()

      if (!existing) {
        await admin.from('payments').insert({
          invoice_id: attempt.invoice_id,
          amount,
          currency,
          status: 'accepted',
          method: paymentMethod ?? null,
          cinetpay_transaction_id: transactionId,
          operator_id: operatorId ?? null,
          paid_at: new Date().toISOString(),
          raw_payload_json: check ?? null,
        })
      }

      await admin.from('invoices').update({ status: 'paid' }).eq('id', attempt.invoice_id)
      await admin
        .from('payment_attempts')
        .update({ status: 'completed' })
        .eq('transaction_id', transactionId)
    } else if (status === 'REFUSED') {
      await admin.from('payments').insert({
        invoice_id: attempt.invoice_id,
        amount,
        currency,
        status: 'refused',
        method: paymentMethod ?? null,
        cinetpay_transaction_id: transactionId,
        operator_id: operatorId ?? null,
        raw_payload_json: check ?? null,
      })

      await admin
        .from('payment_attempts')
        .update({ status: 'failed' })
        .eq('transaction_id', transactionId)
    } else {
      // WAITING / PENDING etc.
      await admin
        .from('payment_attempts')
        .update({ status: 'checked' })
        .eq('transaction_id', transactionId)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erreur webhook CinetPay:', error)
    return NextResponse.json({ error: 'Erreur traitement webhook' }, { status: 500 })
  }
}
