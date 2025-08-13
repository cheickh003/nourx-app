'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { type Invoice, type Quote, type CreateQuoteData, type CreateInvoiceData, type QuoteStatus, type InvoiceStatus, type QuoteItem, type InvoiceItem } from '@/types/database'
import { sendEmail, renderSimpleTemplate } from '@/lib/email/nodemailer'
import { revalidatePath } from 'next/cache'

export async function listClientInvoices(): Promise<{ success: boolean; data: Invoice[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: userRes, error: authErr } = await supabase.auth.getUser()
    if (authErr || !userRes?.user) return { success: false, data: [], error: 'Non authentifié' }

    // Récupérer les clients auxquels l'utilisateur est rattaché
    const { data: memberships, error: memErr } = await supabase
      .from('client_members')
      .select('client_id')
      .eq('user_id', userRes.user.id)

    if (memErr) {
      console.error('listClientInvoices memberships error', memErr)
      return { success: false, data: [], error: 'Erreur chargement des factures' }
    }

    const clientIds = (memberships ?? []).map(m => m.client_id)
    if (clientIds.length === 0) return { success: true, data: [] }

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (name),
        projects (name)
      `)
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: (data ?? []) as Invoice[] }
  } catch (e) {
    console.error('listClientInvoices error', e)
    return { success: false, data: [], error: 'Erreur chargement des factures' }
  }
}

export async function listClientQuotes(): Promise<{ data: Quote[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: userRes, error: authErr } = await supabase.auth.getUser()
    if (authErr || !userRes?.user) return { data: [], error: 'Non authentifié' }

    // Limiter aux clients liés à l'utilisateur (aligné avec listClientInvoices)
    const { data: memberships, error: memErr } = await supabase
      .from('client_members')
      .select('client_id')
      .eq('user_id', userRes.user.id)

    if (memErr) {
      console.error('listClientQuotes memberships error', memErr)
      return { data: [], error: 'Erreur chargement des devis' }
    }

    const clientIds = (memberships ?? []).map(m => m.client_id)
    if (clientIds.length === 0) return { data: [] }

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        clients (name),
        projects (name)
      `)
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: (data ?? []) as Quote[] }
  } catch (e) {
    console.error('listClientQuotes error', e instanceof Error ? e.message : e)
    return { data: [], error: 'Erreur chargement des devis' }
  }
}

// === CRUD QUOTES ===

export async function createQuote(data: CreateQuoteData): Promise<{ success: boolean; data?: Quote; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Générer numéro de devis
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const number = `D-${year}-${randomNum}`;

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        client_id: data.client_id,
        project_id: data.project_id,
        number,
        currency: data.currency || 'XOF',
        total_ht: data.total_ht || 0,
        total_tva: data.total_tva || 0,
        total_ttc: data.total_ttc || 0,
        status: data.status || 'draft',
        expires_at: data.expires_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création devis:', error);
      return { success: false, error: 'Erreur lors de la création du devis' };
    }

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true, data: quote };
  } catch (error: unknown) {
    console.error('Erreur création devis:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de la création du devis' };
  }
}

export async function updateQuote(id: string, data: Partial<CreateQuoteData>): Promise<{ success: boolean; data?: Quote; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: quote, error } = await supabase
      .from('quotes')
      .update({
        ...data,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour devis:', error);
      return { success: false, error: 'Erreur lors de la mise à jour du devis' };
    }

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true, data: quote };
  } catch (error: unknown) {
    console.error('Erreur mise à jour devis:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de la mise à jour du devis' };
  }
}

export async function deleteQuote(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur suppression devis:', error);
      return { success: false, error: 'Erreur lors de la suppression du devis' };
    }

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true };
  } catch (error: unknown) {
    console.error('Erreur suppression devis:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de la suppression du devis' };
  }
}

export async function acceptQuote(quoteId: string): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // 0. Charger le devis et valider son statut/expiration
    const { data: currentQuote, error: fetchQuoteError } = await supabase
      .from('quotes')
      .select('id, status, expires_at, client_id, project_id, currency, total_ht, total_tva, total_ttc')
      .eq('id', quoteId)
      .single();

    if (fetchQuoteError || !currentQuote) {
      return { success: false, error: 'Devis introuvable ou non autorisé' };
    }

    if (currentQuote.status !== 'sent') {
      return { success: false, error: 'Seuls les devis au statut "Envoyé" peuvent être acceptés' };
    }

    if (currentQuote.expires_at) {
      const today = new Date();
      const expiresAt = new Date(currentQuote.expires_at as unknown as string);
      if (expiresAt < new Date(today.toDateString())) {
        return { success: false, error: 'Le devis est expiré et ne peut pas être accepté' };
      }
    }

    // 1. Mettre à jour le statut du devis à 'accepted'
    const { data: updatedQuote, error: updateQuoteError } = await supabase
      .from('quotes')
      .update({ status: 'accepted' as QuoteStatus })
      .eq('id', quoteId)
      .select('*')
      .single();

    if (updateQuoteError || !updatedQuote) {
      console.error('Error updating quote status:', updateQuoteError);
      return { success: false, error: 'Erreur lors de l\'acceptation du devis' };
    }

    // 2. Générer une facture à partir du devis
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `F-${year}-${randomNum}`;

    const { data: newInvoice, error: createInvoiceError } = await supabase
      .from('invoices')
      .insert({
        client_id: updatedQuote.client_id,
        project_id: updatedQuote.project_id,
        number: invoiceNumber,
        currency: updatedQuote.currency,
        total_ht: updatedQuote.total_ht,
        total_tva: updatedQuote.total_tva,
        total_ttc: updatedQuote.total_ttc,
        status: 'issued' as InvoiceStatus,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 30 days
      })
      .select('*')
      .single();

    if (createInvoiceError || !newInvoice) {
      console.error('Error creating invoice from quote:', createInvoiceError);
      return { success: false, error: 'Erreur lors de la génération de la facture' };
    }

    // 3. Copier les éléments du devis vers les éléments de la facture
    const { data: quoteItems, error: fetchItemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId);

    if (fetchItemsError) {
      console.error('Error fetching quote items:', fetchItemsError);
      // Continue even if items fail, main invoice is created
    } else if (quoteItems && quoteItems.length > 0) {
      const invoiceItemsToInsert = quoteItems.map(item => ({
        invoice_id: newInvoice.id,
        label: item.label,
        qty: item.qty,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
      }));

      const { error: insertItemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItemsToInsert);

      if (insertItemsError) {
        console.error('Error inserting invoice items:', insertItemsError);
      }
    }

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true, invoiceId: newInvoice.id };
  } catch (error: unknown) {
    console.error('Error accepting quote:', error);
    return { success: false, error: (error as Error).message || 'Erreur inattendue lors de l\'acceptation du devis' };
  }
}

export async function sendQuote(quoteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Charger le devis + email du client
    const { data: quote, error: fetchErr } = await supabase
      .from('quotes')
      .select(`id, number, status, expires_at, currency, total_ttc, clients(contact_email)`) 
      .eq('id', quoteId)
      .single();

    if (fetchErr || !quote) {
      return { success: false, error: 'Devis introuvable' };
    }

    // Mettre à jour le statut et une date d'expiration par défaut si absente (J+14)
    const defaultExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { error: updErr } = await supabase
      .from('quotes')
      .update({ status: 'sent' as QuoteStatus, expires_at: (quote as { expires_at?: string | null }).expires_at ?? defaultExpiry })
      .eq('id', quoteId);

    if (updErr) {
      console.error('sendQuote update error', updErr);
      return { success: false, error: "Erreur lors de la mise à jour du devis" };
    }

    // Envoyer l'email au client
    try {
      const to = (quote as { clients?: { contact_email?: string | null } })?.clients?.contact_email ?? undefined;
      if (to) {
        const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || 'http://localhost:3000';
        const pdfUrl = `${base}/api/quotes/${quoteId}/pdf`;
        const subject = `[NOURX] Devis ${quote.number}`;
        const html = renderSimpleTemplate(
          'Votre devis',
          `Bonjour,<br/>Veuillez trouver votre devis <b>${quote.number}</b> d'un montant de <b>${Number((quote as { total_ttc: number }).total_ttc).toFixed(2)} ${(quote as { currency: string }).currency}</b>.<br/><br/>Consultez/Téléchargez: <a href="${pdfUrl}">${pdfUrl}</a>`
        );
        await sendEmail({ to, subject, html });
      }
    } catch (mailErr) {
      console.warn('sendQuote mail error (non bloquant)', mailErr);
    }

    revalidatePath('/admin/factures-devis');
    revalidatePath(`/admin/factures-devis/devis/${quoteId}`);
    return { success: true };
  } catch (e: unknown) {
    console.error('sendQuote error', e);
    return { success: false, error: e instanceof Error ? e.message : 'Erreur lors de l\'envoi du devis' };
  }
}

// === CRUD INVOICES ===

export async function createInvoice(data: CreateInvoiceData): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Générer numéro de facture
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const number = `F-${year}-${randomNum}`;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        client_id: data.client_id,
        project_id: data.project_id,
        number,
        currency: data.currency || 'XOF',
        total_ht: data.total_ht || 0,
        total_tva: data.total_tva || 0,
        total_ttc: data.total_ttc || 0,
        status: data.status || 'issued',
        due_date: data.due_date || null,
        external_ref: data.external_ref,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création facture:', error);
      return { success: false, error: 'Erreur lors de la création de la facture' };
    }

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true, data: invoice };
  } catch (error: unknown) {
    console.error('Erreur création facture:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de la création de la facture' };
  }
}

export async function updateInvoice(id: string, data: Partial<CreateInvoiceData>): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update({
        ...data,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour facture:', error);
      return { success: false, error: 'Erreur lors de la mise à jour de la facture' };
    }

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true, data: invoice };
  } catch (error: unknown) {
    console.error('Erreur mise à jour facture:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de la mise à jour de la facture' };
  }
}

export async function deleteInvoice(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur suppression facture:', error);
      return { success: false, error: 'Erreur lors de la suppression de la facture' };
    }

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true };
  } catch (error: unknown) {
    console.error('Erreur suppression facture:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de la suppression de la facture' };
  }
}

// === GETTERS POUR ADMIN/CLIENT ===

export async function getInvoices(): Promise<{ success: boolean; data: Invoice[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, data: null, error: 'Non authentifié' };
    }

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (name),
        projects (name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: invoices as Invoice[], error: null };
  } catch (error: unknown) {
    console.error('Error fetching invoices:', error);
    return { success: false, data: null, error: (error as Error).message || 'Erreur lors de la récupération des factures' };
  }
}

export async function getQuotes(): Promise<{ success: boolean; data: Quote[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, data: null, error: 'Non authentifié' };
    }

    const { data: quotes, error } = await supabase
      .from('quotes')
      .select(`
        *,
        clients (name),
        projects (name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: quotes as Quote[], error: null };
  } catch (error: unknown) {
    console.error('Error fetching quotes:', error);
    return { success: false, data: null, error: (error as Error).message || 'Erreur lors de la récupération des devis' };
  }
}

export async function requestPayment(invoiceId: string): Promise<{ url?: string; token?: string; error?: string }> {
  try {
    // Pré-validation côté serveur (RLS appliquée)
    const supabase = await createClient()
    const { data: userRes } = await supabase.auth.getUser()
    if (!userRes?.user) return { error: 'Non authentifié' }

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id, number, status, currency, total_ttc, due_date')
      .eq('id', invoiceId)
      .single()

    if (invErr || !invoice) return { error: 'Facture introuvable ou non autorisée' }

    // Statut strictement "issued" avant init paiement
    if (invoice.status !== 'issued') {
      return { error: 'Le paiement ne peut être initié que pour une facture émise' }
    }

    // Date d’échéance non passée
    if (invoice.due_date) {
      const today = new Date()
      const due = new Date(invoice.due_date as unknown as string)
      if (due < new Date(today.toDateString())) {
        return { error: 'La facture est échue' }
      }
    }

    // Montant et devise
    const amount = Number(invoice.total_ttc)
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: 'Montant de facture invalide' }
    }
    const supportedCurrencies = new Set(['XOF', 'USD', 'EUR'])
    if (!supportedCurrencies.has(String(invoice.currency).toUpperCase())) {
      return { error: 'Devise non supportée' }
    }

    // Appel route init paiement
    const hdrs = await headers()
    const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host')
    const proto = hdrs.get('x-forwarded-proto') ?? 'http'
    const base = process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : 'http://localhost:3000')

    console.log('Init paiement demandé', { invoiceId, number: invoice.number, amount, currency: invoice.currency })

    const res = await fetch(`${base}/api/invoices/${invoiceId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) return { error: data?.error ?? 'Echec initialisation paiement' }
    return { url: data?.payment_url, token: data?.payment_token }
  } catch (e) {
    console.error('requestPayment error', e)
    return { error: 'Erreur initialisation paiement' }
  } finally {
    revalidatePath('/factures-devis')
  }
}

// === CRUD QUOTE ITEMS ===

export async function addQuoteItem(quoteId: string, item: { label: string; qty: number; unit_price: number; vat_rate: number }): Promise<{ success: boolean; data?: QuoteItem; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: quoteItem, error } = await supabase
      .from('quote_items')
      .insert({
        quote_id: quoteId,
        label: item.label,
        qty: item.qty,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur ajout item devis:', error);
      return { success: false, error: 'Erreur lors de l\'ajout de l\'item' };
    }

    // Recalculer les totaux du devis
    await recalculateQuoteTotals(quoteId);

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true, data: quoteItem };
  } catch (error: unknown) {
    console.error('Erreur ajout item devis:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de l\'ajout de l\'item' };
  }
}

export async function updateQuoteItem(itemId: number, item: { label: string; qty: number; unit_price: number; vat_rate: number }): Promise<{ success: boolean; data?: QuoteItem; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: quoteItem, error } = await supabase
      .from('quote_items')
      .update({
        label: item.label,
        qty: item.qty,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Erreur modification item devis:', error);
      return { success: false, error: 'Erreur lors de la modification de l\'item' };
    }

    // Recalculer les totaux du devis
    await recalculateQuoteTotals(quoteItem.quote_id);

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true, data: quoteItem };
  } catch (error: unknown) {
    console.error('Erreur modification item devis:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de la modification de l\'item' };
  }
}

export async function deleteQuoteItem(itemId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Récupérer l'item pour obtenir le quote_id avant suppression
    const { data: item, error: fetchError } = await supabase
      .from('quote_items')
      .select('quote_id')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Item non trouvé' };
    }

    const { error } = await supabase
      .from('quote_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Erreur suppression item devis:', error);
      return { success: false, error: 'Erreur lors de la suppression de l\'item' };
    }

    // Recalculer les totaux du devis
    await recalculateQuoteTotals(item.quote_id);

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true };
  } catch (error: unknown) {
    console.error('Erreur suppression item devis:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de la suppression de l\'item' };
  }
}

// === CRUD INVOICE ITEMS ===

export async function addInvoiceItem(invoiceId: string, item: { label: string; qty: number; unit_price: number; vat_rate: number }): Promise<{ success: boolean; data?: InvoiceItem; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: invoiceItem, error } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoiceId,
        label: item.label,
        qty: item.qty,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur ajout item facture:', error);
      return { success: false, error: 'Erreur lors de l\'ajout de l\'item' };
    }

    // Recalculer les totaux de la facture
    await recalculateInvoiceTotals(invoiceId);

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true, data: invoiceItem };
  } catch (error: unknown) {
    console.error('Erreur ajout item facture:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de l\'ajout de l\'item' };
  }
}

export async function updateInvoiceItem(itemId: number, item: { label: string; qty: number; unit_price: number; vat_rate: number }): Promise<{ success: boolean; data?: InvoiceItem; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: invoiceItem, error } = await supabase
      .from('invoice_items')
      .update({
        label: item.label,
        qty: item.qty,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Erreur modification item facture:', error);
      return { success: false, error: 'Erreur lors de la modification de l\'item' };
    }

    // Recalculer les totaux de la facture
    await recalculateInvoiceTotals(invoiceItem.invoice_id);

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true, data: invoiceItem };
  } catch (error: unknown) {
    console.error('Erreur modification item facture:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de la modification de l\'item' };
  }
}

export async function deleteInvoiceItem(itemId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Récupérer l'item pour obtenir l'invoice_id avant suppression
    const { data: item, error: fetchError } = await supabase
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Item non trouvé' };
    }

    const { error } = await supabase
      .from('invoice_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Erreur suppression item facture:', error);
      return { success: false, error: 'Erreur lors de la suppression de l\'item' };
    }

    // Recalculer les totaux de la facture
    await recalculateInvoiceTotals(item.invoice_id);

    revalidatePath('/admin/factures-devis');
    revalidatePath('/factures-devis');
    return { success: true };
  } catch (error: unknown) {
    console.error('Erreur suppression item facture:', error);
    return { success: false, error: (error as Error).message || 'Erreur lors de la suppression de l\'item' };
  }
}

// === FONCTIONS UTILITAIRES ===

async function recalculateQuoteTotals(quoteId: string): Promise<void> {
  const supabase = await createClient();
  
  // Récupérer tous les items du devis
  const { data: items, error: itemsError } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', quoteId);

  if (itemsError || !items) {
    console.error('Erreur récupération items devis:', itemsError);
    return;
  }

  // Calculer les totaux
  let total_ht = 0;
  let total_tva = 0;

  items.forEach((item) => {
    const line_ht = item.qty * item.unit_price;
    const line_tva = line_ht * (item.vat_rate / 100);
    total_ht += line_ht;
    total_tva += line_tva;
  });

  const total_ttc = total_ht + total_tva;

  // Mettre à jour le devis
  await supabase
    .from('quotes')
    .update({
      total_ht: Math.round(total_ht * 100) / 100,
      total_tva: Math.round(total_tva * 100) / 100,
      total_ttc: Math.round(total_ttc * 100) / 100,
    })
    .eq('id', quoteId);
}

async function recalculateInvoiceTotals(invoiceId: string): Promise<void> {
  const supabase = await createClient();
  
  // Récupérer tous les items de la facture
  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId);

  if (itemsError || !items) {
    console.error('Erreur récupération items facture:', itemsError);
    return;
  }

  // Calculer les totaux
  let total_ht = 0;
  let total_tva = 0;

  items.forEach((item) => {
    const line_ht = item.qty * item.unit_price;
    const line_tva = line_ht * (item.vat_rate / 100);
    total_ht += line_ht;
    total_tva += line_tva;
  });

  const total_ttc = total_ht + total_tva;

  // Mettre à jour la facture
  await supabase
    .from('invoices')
    .update({
      total_ht: Math.round(total_ht * 100) / 100,
      total_tva: Math.round(total_tva * 100) / 100,
      total_ttc: Math.round(total_ttc * 100) / 100,
    })
    .eq('id', invoiceId);
}

// === GETTERS POUR ITEMS ===

export async function getQuoteItems(quoteId: string): Promise<{ success: boolean; data: QuoteItem[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, data: null, error: 'Non authentifié' };
    }

    const { data: items, error } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('id', { ascending: true });

    if (error) throw error;
    return { success: true, data: items as QuoteItem[], error: null };
  } catch (error: unknown) {
    console.error('Error fetching quote items:', error);
    return { success: false, data: null, error: (error as Error).message || 'Erreur lors de la récupération des items' };
  }
}

export async function getInvoiceItems(invoiceId: string): Promise<{ success: boolean; data: InvoiceItem[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, data: null, error: 'Non authentifié' };
    }

    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('id', { ascending: true });

    if (error) throw error;
    return { success: true, data: items as InvoiceItem[], error: null };
  } catch (error: unknown) {
    console.error('Error fetching invoice items:', error);
    return { success: false, data: null, error: (error as Error).message || 'Erreur lors de la récupération des items' };
  }
}


