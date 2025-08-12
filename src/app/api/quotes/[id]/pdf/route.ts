import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { type Quote, type QuoteItem } from '@/types/database';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer le devis
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        clients (name, contact_email),
        projects (name),
        quote_items (*)
      `)
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    // TODO: Implémenter génération PDF avec une lib comme puppeteer ou jsPDF
    // Pour l'instant, retourner un HTML simple
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Devis ${quote.number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            .items { width: 100%; border-collapse: collapse; }
            .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items th { background-color: #f2f2f2; }
            .total { text-align: right; margin-top: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DEVIS</h1>
            <h2>${quote.number}</h2>
          </div>
          
          <div class="info">
            <p><strong>Client:</strong> ${(quote as Quote & { clients?: { name: string }; projects?: { name: string } }).clients?.name || 'N/A'}</p>
            <p><strong>Projet:</strong> ${(quote as Quote & { clients?: { name: string }; projects?: { name: string } }).projects?.name || 'N/A'}</p>
            <p><strong>Date:</strong> ${new Date(quote.created_at).toLocaleDateString('fr-FR')}</p>
            ${quote.expires_at ? `<p><strong>Expire le:</strong> ${new Date(quote.expires_at).toLocaleDateString('fr-FR')}</p>` : ''}
          </div>

          ${(quote as Quote & { quote_items?: QuoteItem[] }).quote_items?.length ? `
            <table class="items">
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>TVA</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${(quote as Quote & { quote_items?: QuoteItem[] }).quote_items?.map((item: QuoteItem) => `
                  <tr>
                    <td>${item.label}</td>
                    <td>${item.qty}</td>
                    <td>${item.unit_price} ${quote.currency}</td>
                    <td>${item.vat_rate}%</td>
                    <td>${(item.qty * item.unit_price).toFixed(2)} ${quote.currency}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p>Aucun élément dans ce devis.</p>'}

          <div class="total">
            <p>Total HT: ${quote.total_ht} ${quote.currency}</p>
            <p>Total TVA: ${quote.total_tva} ${quote.currency}</p>
            <p><strong>Total TTC: ${quote.total_ttc} ${quote.currency}</strong></p>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="devis-${quote.number}.html"`,
      },
    });

  } catch (error) {
    console.error('Erreur génération PDF devis:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
