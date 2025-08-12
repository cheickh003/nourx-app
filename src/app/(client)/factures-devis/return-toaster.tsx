'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function PaymentReturnToaster() {
  const params = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const success = params.get('success')
    const error = params.get('error')
    const pending = params.get('pending')
    const invoiceId = params.get('invoice_id')

    if (success) {
      toast.success('Paiement accepté')
    } else if (error) {
      toast.error('Paiement refusé')
    } else if (pending) {
      toast('Paiement en attente de confirmation')
    } else {
      return
    }

    const url = new URL(window.location.href)
    url.searchParams.delete('success')
    url.searchParams.delete('error')
    url.searchParams.delete('pending')
    if (invoiceId) url.searchParams.delete('invoice_id')
    router.replace(url.pathname + (url.search ? `?${url.searchParams.toString()}` : ''))
  }, [params, router])

  return null
}


