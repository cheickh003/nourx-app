import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function handleReturn(req: NextRequest) {
  const url = new URL(req.url)
  // const paymentToken = url.searchParams.get('payment_token') || undefined
  const transactionId = url.searchParams.get('transaction_id') || undefined

  const admin = createAdminClient()
  try {
    if (!transactionId) {
      return NextResponse.redirect(new URL('/factures-devis?error=1', url.origin))
    }

    // Marquer la tentative comme "returned" (retour utilisateur) si connue
    const { data: attempt } = await admin
      .from('payment_attempts')
      .select('id, invoice_id')
      .eq('transaction_id', transactionId)
      .maybeSingle()

    if (attempt) {
      await admin
        .from('payment_attempts')
        .update({ status: 'redirected' })
        .eq('id', attempt.id)
    }

    // Optionnel: check immédiat côté serveur pour retour UX plus précis
    let statusParam = 'pending=1'
    try {
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
      const status = String(check?.data?.status ?? '').toUpperCase()
      if (status === 'ACCEPTED') statusParam = 'success=1'
      else if (status === 'REFUSED') statusParam = 'error=1'
      else statusParam = 'pending=1'
    } catch (e) {
      // Si échec du check, rester en pending
      console.error('return check error', e)
    }

    const redirectUrl = new URL('/factures-devis', url.origin)
    redirectUrl.search = `${statusParam}${attempt?.invoice_id ? `&invoice_id=${attempt.invoice_id}` : ''}`
    return NextResponse.redirect(redirectUrl)
  } catch (e) {
    console.error('payment return error', e)
    return NextResponse.redirect(new URL('/factures-devis?error=1', url.origin))
  }
}

export async function GET(req: NextRequest) {
  return handleReturn(req)
}

export async function POST(req: NextRequest) {
  return handleReturn(req)
}


