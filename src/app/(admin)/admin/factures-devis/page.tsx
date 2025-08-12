'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getInvoices, getQuotes } from '@/app/actions/invoices';
import { Invoice, Quote, Payment, PaymentAttempt } from '@/types/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, DollarSign, History, ReceiptText, Loader2 } from 'lucide-react';
import { FinanceStatusBadge } from '@/components/ui/finance-status-badge';
import { createClient } from '@/lib/supabase/client';
import { QuoteCreateDialog } from '@/components/admin/quote-create-dialog';
import { InvoiceCreateDialog } from '@/components/admin/invoice-create-dialog';
import { QuoteActions, InvoiceActions } from '@/components/admin/finance-actions';
import { toast } from 'sonner';

export default function AdminFacturesDevisPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentAttempts, setPaymentAttempts] = useState<PaymentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFinanceData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      
      const [invoicesResult, quotesResult, paymentsResult, attemptsResult] = await Promise.all([
        getInvoices(),
        getQuotes(),
        supabase.from('payments').select(`*, invoices(number, clients(name))`).order('created_at', { ascending: false }),
        supabase.from('payment_attempts').select(`*, invoices(number, clients(name))`).order('created_at', { ascending: false }),
      ]);

      if (invoicesResult.success && invoicesResult.data) {
        setInvoices(invoicesResult.data);
      } else {
        toast.error(invoicesResult.error || 'Erreur lors du chargement des factures');
      }

      if (quotesResult.success && quotesResult.data) {
        setQuotes(quotesResult.data);
      } else {
        toast.error(quotesResult.error || 'Erreur lors du chargement des devis');
      }

      if (paymentsResult.data) {
        setPayments(paymentsResult.data);
      }

      if (attemptsResult.data) {
        setPaymentAttempts(attemptsResult.data);
      }
    } catch (error) {
      console.error('Erreur chargement données finance:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="rounded-lg border bg-card p-6 animate-pulse h-64"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion Factures & Devis</h1>
          <p className="text-muted-foreground">
            Administration de toutes les factures, devis et paiements.
          </p>
        </div>
        <div className="flex gap-2">
          <QuoteCreateDialog onQuoteCreated={fetchFinanceData} />
          <InvoiceCreateDialog onInvoiceCreated={fetchFinanceData} />
        </div>
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Factures ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Devis ({quotes.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Paiements ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="attempts" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Tentatives ({paymentAttempts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Toutes les Factures</CardTitle>
              <CardDescription>Liste complète des factures émises.</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune facture trouvée.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Projet</TableHead>
                      <TableHead>Montant TTC</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Émise le</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell>{(invoice as Invoice & { clients?: { name: string }; projects?: { name: string } }).clients?.name || 'N/A'}</TableCell>
                        <TableCell>{(invoice as Invoice & { clients?: { name: string }; projects?: { name: string } }).projects?.name || 'N/A'}</TableCell>
                        <TableCell>{invoice.total_ttc} {invoice.currency}</TableCell>
                        <TableCell>
                          <FinanceStatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell>{format(new Date(invoice.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                        <TableCell>
                          <InvoiceActions invoice={invoice} onUpdate={fetchFinanceData} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tous les Devis</CardTitle>
              <CardDescription>Liste complète des devis.</CardDescription>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun devis trouvé.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Projet</TableHead>
                      <TableHead>Montant TTC</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">{quote.number}</TableCell>
                        <TableCell>{(quote as Quote & { clients?: { name: string }; projects?: { name: string } }).clients?.name || 'N/A'}</TableCell>
                        <TableCell>{(quote as Quote & { clients?: { name: string }; projects?: { name: string } }).projects?.name || 'N/A'}</TableCell>
                        <TableCell>{quote.total_ttc} {quote.currency}</TableCell>
                        <TableCell>
                          <FinanceStatusBadge status={quote.status} />
                        </TableCell>
                        <TableCell>{format(new Date(quote.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                        <TableCell>
                          <QuoteActions quote={quote} onUpdate={fetchFinanceData} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tous les Paiements</CardTitle>
              <CardDescription>Historique des paiements réussis ou échoués.</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun paiement trouvé.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Facture</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>ID Transaction CinetPay</TableHead>
                      <TableHead>Payé le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{(payment as Payment & { invoices?: { number: string; clients?: { name: string } } }).invoices?.number || 'N/A'}</TableCell>
                        <TableCell>{(payment as Payment & { invoices?: { number: string; clients?: { name: string } } }).invoices?.clients?.name || 'N/A'}</TableCell>
                        <TableCell>{payment.amount} {payment.currency}</TableCell>
                        <TableCell>
                          <FinanceStatusBadge status={payment.status} />
                        </TableCell>
                        <TableCell>{payment.method || 'N/A'}</TableCell>
                        <TableCell className="text-xs">{payment.cinetpay_transaction_id || 'N/A'}</TableCell>
                        <TableCell>{payment.paid_at ? format(new Date(payment.paid_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attempts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tentatives de Paiement</CardTitle>
              <CardDescription>Historique détaillé de toutes les tentatives de paiement.</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentAttempts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune tentative de paiement trouvée.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Facture</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>ID Transaction</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Créée le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="font-medium">{(attempt as PaymentAttempt & { invoices?: { number: string; clients?: { name: string } } }).invoices?.number || 'N/A'}</TableCell>
                        <TableCell>{(attempt as PaymentAttempt & { invoices?: { number: string; clients?: { name: string } } }).invoices?.clients?.name || 'N/A'}</TableCell>
                        <TableCell className="text-xs">{attempt.transaction_id}</TableCell>
                        <TableCell>{attempt.amount} {attempt.currency}</TableCell>
                        <TableCell>
                          <FinanceStatusBadge status={attempt.status} />
                        </TableCell>
                        <TableCell>{attempt.channel || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(attempt.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}