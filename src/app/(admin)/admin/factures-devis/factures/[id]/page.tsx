import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FinanceStatusBadge } from '@/components/ui/finance-status-badge';
import dynamic from 'next/dynamic'
const ItemsManager = dynamic(() => import('@/components/admin/items-manager').then(m => m.ItemsManager))
import { ArrowLeft, FileText, Calendar, User, Building, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { Invoice } from '@/types/database';
import { requestPayment } from '@/app/actions/invoices';

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = await createClient();
  
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      clients (name),
      projects (name)
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    return null;
  }

  return invoice as Invoice;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const invoice = await getInvoice(id);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/factures-devis">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Facture {invoice.number}</h1>
          <p className="text-muted-foreground">
            Détails et gestion des items de la facture
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Informations de la facture */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Numéro</label>
              <p className="font-medium">{invoice.number}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Statut</label>
              <div className="mt-1">
                <FinanceStatusBadge status={invoice.status} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Client</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{(invoice as Invoice & { clients?: { name: string } }).clients?.name || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Projet</label>
              <div className="flex items-center gap-2 mt-1">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{(invoice as Invoice & { projects?: { name: string } }).projects?.name || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Date de création</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(invoice.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
            </div>

            {invoice.due_date && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date d&apos;échéance</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: fr })}</span>
                </div>
              </div>
            )}

            {invoice.external_ref && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Référence externe</label>
                <p className="font-medium">{invoice.external_ref}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totaux */}
        <Card>
          <CardHeader>
            <CardTitle>Totaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-medium">{invoice.total_ht.toFixed(2)} {invoice.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total TVA</span>
              <span className="font-medium">{invoice.total_tva.toFixed(2)} {invoice.currency}</span>
            </div>
            <div className="flex justify-between border-t pt-3 font-bold">
              <span>Total TTC</span>
              <span>{invoice.total_ttc.toFixed(2)} {invoice.currency}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full">
              <Link href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-2" />
                Générer PDF
              </Link>
            </Button>
            
            {invoice.status === 'draft' && (
              <Button variant="outline" className="w-full">
                Envoyer au client
              </Button>
            )}
            
            {(invoice.status === 'issued' || invoice.status === 'sent') && (
              <form
                action={async () => {
                  'use server'
                  const res = await requestPayment(invoice.id)
                  if (res.url) redirect(res.url)
                }}
              >
                <Button className="w-full" type="submit">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Initier paiement
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gestion des items */}
      <Suspense fallback={<div>Chargement des items...</div>}>
        <ItemsManager 
          documentId={invoice.id} 
          documentType="invoice"
          onTotalsUpdated={() => {
            // Rafraîchir la page pour mettre à jour les totaux
            window.location.reload();
          }}
        />
      </Suspense>
    </div>
  );
}
