import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FinanceStatusBadge } from '@/components/ui/finance-status-badge';
import { ItemsManager } from '@/components/admin/items-manager';
import { ArrowLeft, FileText, Calendar, User, Building } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { Quote } from '@/types/database';

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getQuote(id: string): Promise<Quote | null> {
  const supabase = await createClient();
  
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      clients (name),
      projects (title)
    `)
    .eq('id', id)
    .single();

  if (error || !quote) {
    return null;
  }

  return quote as Quote;
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) {
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
          <h1 className="text-3xl font-bold">Devis {quote.number}</h1>
          <p className="text-muted-foreground">
            Détails et gestion des items du devis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Informations du devis */}
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
              <p className="font-medium">{quote.number}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Statut</label>
              <div className="mt-1">
                <FinanceStatusBadge status={quote.status} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Client</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{(quote as Quote & { clients?: { name: string } }).clients?.name || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Projet</label>
              <div className="flex items-center gap-2 mt-1">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{(quote as Quote & { projects?: { title: string } }).projects?.title || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Date de création</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(quote.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
            </div>

            {quote.expires_at && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date d&apos;expiration</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(quote.expires_at), 'dd/MM/yyyy', { locale: fr })}</span>
                </div>
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
              <span className="font-medium">{quote.total_ht.toFixed(2)} {quote.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total TVA</span>
              <span className="font-medium">{quote.total_tva.toFixed(2)} {quote.currency}</span>
            </div>
            <div className="flex justify-between border-t pt-3 font-bold">
              <span>Total TTC</span>
              <span>{quote.total_ttc.toFixed(2)} {quote.currency}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Générer PDF
            </Button>
            
            {quote.status === 'draft' && (
              <Button variant="outline" className="w-full">
                Envoyer au client
              </Button>
            )}
            
            {quote.status === 'sent' && (
              <Button className="w-full">
                Accepter le devis
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gestion des items */}
      <Suspense fallback={<div>Chargement des items...</div>}>
        <ItemsManager 
          documentId={quote.id} 
          documentType="quote"
          onTotalsUpdated={() => {
            // Rafraîchir la page pour mettre à jour les totaux
            window.location.reload();
          }}
        />
      </Suspense>
    </div>
  );
}
