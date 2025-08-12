import { listClientInvoices, listClientQuotes, requestPayment } from '@/app/actions/invoices'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { redirect } from 'next/navigation'
import PaymentReturnToaster from './return-toaster'
import { Suspense } from 'react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function FacturesDevisPage() {
  const [invoicesRes, quotesRes] = await Promise.all([
    listClientInvoices(),
    listClientQuotes(),
  ])
  const invoices = invoicesRes.data
  const quotes = quotesRes.data

  async function payInvoice(formData: FormData) {
    'use server'
    const id = String(formData.get('invoice_id'))
    const res = await requestPayment(id)
    if (res.url) redirect(res.url)
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<div>Chargement...</div>}>
        <PaymentReturnToaster />
      </Suspense>
      <div>
        <h1 className="text-3xl font-bold">Factures & Devis</h1>
        <p className="text-muted-foreground">Gestion de vos factures et devis.</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Factures</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Devise</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices?.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.number}</TableCell>
                  <TableCell>{Number(inv.total_ttc).toFixed(0)}</TableCell>
                  <TableCell>{inv.currency}</TableCell>
                  <TableCell>{inv.status}</TableCell>
                  <TableCell className="text-right">
                    {inv.status !== 'paid' ? (
                      <form action={payInvoice}>
                        <input type="hidden" name="invoice_id" value={inv.id} />
                        <Button type="submit" size="sm">Payer</Button>
                      </form>
                    ) : (
                      <span className="text-emerald-600">Payée</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>Vos factures récentes</TableCaption>
          </Table>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Devis</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes?.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>{q.number}</TableCell>
                  <TableCell>{Number(q.total_ttc).toFixed(0)} {q.currency}</TableCell>
                  <TableCell>{q.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>Vos devis</TableCaption>
          </Table>
        </div>
      </div>
    </div>
  )
}
