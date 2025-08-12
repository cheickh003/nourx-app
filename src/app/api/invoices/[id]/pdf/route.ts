import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { type Invoice, type InvoiceItem } from '@/types/database';

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

    // Récupérer la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (name, contact_email),
        projects (name),
        invoice_items (*)
      `)
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // TODO: Implémenter génération PDF avec une lib comme puppeteer ou jsPDF
    // Pour l'instant, retourner un HTML simple
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Facture ${invoice.number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            .items { width: 100%; border-collapse: collapse; }
            .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items th { background-color: #f2f2f2; }
            .total { text-align: right; margin-top: 20px; font-weight: bold; }
            .status { padding: 5px 10px; border-radius: 3px; color: white; }
            .status.paid { background-color: #22c55e; }
            .status.issued { background-color: #3b82f6; }
            .status.overdue { background-color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FACTURE</h1>
            <h2>${invoice.number}</h2>
            <span class="status ${invoice.status}">${invoice.status.toUpperCase()}</span>
          </div>
          
          <div class="info">
            <p><strong>Client:</strong> ${(invoice as Invoice & { clients?: { name: string }; projects?: { name: string } }).clients?.name || 'N/A'}</p>
            <p><strong>Projet:</strong> ${(invoice as Invoice & { clients?: { name: string }; projects?: { name: string } }).projects?.name || 'N/A'}</p>
            <p><strong>Date d'émission:</strong> ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}</p>
            ${invoice.due_date ? `<p><strong>Échéance:</strong> ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}</p>` : ''}
            ${invoice.external_ref ? `<p><strong>Référence externe:</strong> ${invoice.external_ref}</p>` : ''}
          </div>

          ${(invoice as Invoice & { invoice_items?: InvoiceItem[] }).invoice_items?.length ? `
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
                ${(invoice as Invoice & { invoice_items?: InvoiceItem[] }).invoice_items?.map((item: InvoiceItem) => `
                  <tr>
                    <td>${item.label}</td>
                    <td>${item.qty}</td>
                    <td>${item.unit_price} ${invoice.currency}</td>
                    <td>${item.vat_rate}%</td>
                    <td>${(item.qty * item.unit_price).toFixed(2)} ${invoice.currency}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p>Aucun élément dans cette facture.</p>'}

          <div class="total">
            <p>Total HT: ${invoice.total_ht} ${invoice.currency}</p>
            <p>Total TVA: ${invoice.total_tva} ${invoice.currency}</p>
            <p><strong>Total TTC: ${invoice.total_ttc} ${invoice.currency}</strong></p>
          </div>

          ${invoice.status === 'issued' || invoice.status === 'overdue' ? `
            <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <p><strong>Paiement en ligne disponible</strong></p>
              <p>Vous pouvez régler cette facture directement en ligne via Mobile Money, carte bancaire, etc.</p>
            </div>
          ` : ''}
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="facture-${invoice.number}.html"`,
      },
    });

  } catch (error) {
    console.error('Erreur génération PDF facture:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
