import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function isMultipleOfFive(amount: number, currency: string): boolean {
  if (currency.toUpperCase() === 'USD') return true
  return amount % 5 === 0
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const invoiceId = (await params).id
    const supabase = await createServerSupabase()
    const { data: userRes } = await supabase.auth.getUser()
    if (!userRes?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer la facture via RLS (client ou admin)
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id, number, status, currency, total_ttc, client_id, project_id, due_date')
      .eq('id', invoiceId)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable ou non autorisée' }, { status: 404 })
    }

    // Validations renforcées
    if (invoice.status !== 'issued') {
      return NextResponse.json({ error: 'Seules les factures émises peuvent être payées' }, { status: 400 })
    }

    if (invoice.due_date) {
      const today = new Date()
      const due = new Date(invoice.due_date as unknown as string)
      if (due < new Date(today.toDateString())) {
        return NextResponse.json({ error: 'Facture échue' }, { status: 400 })
      }
    }

    const amount = Number(invoice.total_ttc)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Montant de facture invalide' }, { status: 400 })
    }
    const currency = String(invoice.currency).toUpperCase()
    const supportedCurrencies = new Set(['XOF', 'USD', 'EUR'])
    if (!supportedCurrencies.has(currency)) {
      return NextResponse.json({ error: 'Devise non supportée' }, { status: 400 })
    }

    const roundedAmount = Math.round(amount)
    if (!isMultipleOfFive(roundedAmount, currency)) {
      return NextResponse.json({ error: 'Montant non valide (multiple de 5 requis hors USD)' }, { status: 400 })
    }

    const transactionId = invoice.number // idempotence: numéro de facture comme clé de transaction
    const payload = {
      apikey: process.env.CINETPAY_APIKEY!,
      site_id: process.env.CINETPAY_SITE_ID!,
      transaction_id: transactionId,
      amount: roundedAmount,
      currency,
      description: `Facture ${invoice.number}`,
      notify_url: process.env.CINETPAY_NOTIFY_URL!,
      return_url: process.env.CINETPAY_RETURN_URL!,
      channels: 'ALL',
    }

    const initRes = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const initData = await initRes.json()
    if (!initRes.ok) {
      console.error('CinetPay init error', initData)
      return NextResponse.json({ error: 'Erreur initialisation paiement' }, { status: 400 })
    }

    const admin = createAdminClient()
    // Insérer ou mettre à jour la tentative (idempotence par transaction_id)
    const { data: existingAttempt } = await admin
      .from('payment_attempts')
      .select('id')
      .eq('transaction_id', transactionId)
      .maybeSingle()

    if (existingAttempt) {
      await admin
        .from('payment_attempts')
        .update({
          invoice_id: invoice.id,
          cinetpay_payment_token: initData?.data?.payment_token ?? null,
          cinetpay_payment_url: initData?.data?.payment_url ?? null,
          status: 'redirected',
          channel: 'ALL',
          amount: roundedAmount,
          currency,
        })
        .eq('id', existingAttempt.id)
    } else {
      await admin.from('payment_attempts').insert({
        invoice_id: invoice.id,
        cinetpay_payment_token: initData?.data?.payment_token ?? null,
        cinetpay_payment_url: initData?.data?.payment_url ?? null,
        transaction_id: transactionId,
        status: 'redirected',
        channel: 'ALL',
        amount: roundedAmount,
        currency,
      })
    }

    return NextResponse.json({
      payment_token: initData?.data?.payment_token,
      payment_url: initData?.data?.payment_url,
      transaction_id: transactionId,
    })
  } catch (error) {
    console.error('Erreur init paiement:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


