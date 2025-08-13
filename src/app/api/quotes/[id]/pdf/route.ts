import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { type Quote, type QuoteItem } from '@/types/database';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'node:fs/promises';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer le devis
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        clients (name, contact_email, phone),
        projects (name),
        quote_items (*)
      `)
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    // Génération PDF (pdf-lib)
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const margin = 48;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - margin;
    const drawText = (text: string, x: number, size = 12, boldFace = false, color = rgb(0, 0, 0)) => {
      page.drawText(text, { x, y, size, font: boldFace ? bold : font, color });
      y -= size + 6;
    };

    // Charger coordonnées organisation
    const { data: org } = await supabase.from('org_settings').select('*').order('id', { ascending: true }).limit(1).maybeSingle();

    // Header band + logo
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: rgb(0.95,0.96,0.98) });
    try {
      const logoBytes = await readFile(process.cwd() + '/public/CNourx.png');
      const logo = await pdfDoc.embedPng(logoBytes);
      const logoW = 64; const logoH = (logoW / logo.width) * logo.height;
      page.drawImage(logo, { x: margin, y: height - 75, width: logoW, height: logoH });
    } catch {}
    page.drawText(String(org?.name || 'NOURX'), { x: margin + 80, y: height - 58, size: 16, font: bold, color: rgb(0.1,0.12,0.18) });
    // Coordonnées société (header droit)
    const headerInfoX = width - margin - 240;
    const headerInfoY = height - 60;
    const headerLines: string[] = [
      org?.address || '',
      [org?.phone, org?.email].filter(Boolean).join(' · '),
      org?.website || '',
    ].filter(Boolean);
    let hoff = 0;
    for (const l of headerLines) {
      page.drawText(l, { x: headerInfoX, y: headerInfoY - hoff, size: 9, font, color: rgb(0.35,0.37,0.42) });
      hoff += 12;
    }

    drawText('DEVIS', margin, 22, true);
    drawText(`# ${quote.number}`, width - margin - (bold.widthOfTextAtSize(`# ${quote.number}`, 12)), 12, true);

    y -= 6;
    const clientName = (quote as Quote & { clients?: { name: string } }).clients?.name || 'N/A';
    const clientEmail = (quote as Quote & { clients?: { contact_email?: string|null } }).clients?.contact_email || '';
    const clientPhone = (quote as Quote & { clients?: { phone?: string|null } }).clients?.phone || '';
    const projectName = (quote as Quote & { projects?: { name: string } }).projects?.name || 'N/A';
    drawText(`Client: ${clientName}`, margin, 12);
    if (clientPhone || clientEmail) drawText([clientPhone, clientEmail].filter(Boolean).join(' · '), margin, 11);
    drawText(`Projet: ${projectName}`, margin, 12);
    drawText(`Date: ${new Date(quote.created_at).toLocaleDateString('fr-FR')}`, margin, 12);
    if (quote.expires_at) drawText(`Expire le: ${new Date(quote.expires_at).toLocaleDateString('fr-FR')}`, margin, 12);

    y -= 8;
    drawText('Désignation', margin, 12, true);
    page.drawText('Qté', { x: width - margin - 180, y: y + 0, size: 12, font: bold });
    page.drawText('PU', { x: width - margin - 120, y: y + 0, size: 12, font: bold });
    page.drawText('TVA', { x: width - margin - 70, y: y + 0, size: 12, font: bold });
    page.drawText('Total', { x: width - margin - 20 - 40, y: y + 0, size: 12, font: bold });
    y -= 16;

    const items = (quote as Quote & { quote_items?: QuoteItem[] }).quote_items || [];
    if (items.length === 0) {
      drawText('Aucun élément.', margin, 12);
    } else {
      for (const item of items) {
        const line = String(item.label);
        page.drawText(line.length > 60 ? `${line.slice(0, 57)}...` : line, { x: margin, y, size: 11, font });
        page.drawText(String(item.qty), { x: width - margin - 180, y, size: 11, font });
        page.drawText(`${Number(item.unit_price).toFixed(0)} ${quote.currency}`, { x: width - margin - 120, y, size: 11, font });
        page.drawText(`${item.vat_rate}%`, { x: width - margin - 70, y, size: 11, font });
        const total = (Number(item.qty) * Number(item.unit_price)).toFixed(0);
        page.drawText(`${total} ${quote.currency}`, { x: width - margin - 20 - 40, y, size: 11, font });
        y -= 16;
        if (y < margin + 120) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = 841.89 - margin - 120;
        }
      }
    }

    y -= 8;
    drawText(`Total HT: ${Number(quote.total_ht).toFixed(2)} ${quote.currency}`, width - 260, 12, true);
    drawText(`Total TVA: ${Number(quote.total_tva).toFixed(2)} ${quote.currency}`, width - 260, 12, true);
    drawText(`Total TTC: ${Number(quote.total_ttc).toFixed(2)} ${quote.currency}`, width - 260, 14, true, rgb(0.1, 0.1, 0.1));

    // Footer avec mentions légales
    page.drawLine({ start: { x: margin, y: margin + 44 }, end: { x: width - margin, y: margin + 44 }, thickness: 0.5, color: rgb(0.88,0.9,0.92) });
    const legal = String(org?.legal || '').trim();
    if (legal) {
      const words = legal.split(' ');
      let line = '';
      let fy = margin + 30;
      const maxW = width - margin*2;
      for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (bold.widthOfTextAtSize(next, 8) > maxW && line) {
          page.drawText(line, { x: margin, y: fy, size: 8, font, color: rgb(0.4,0.42,0.48) });
          fy -= 10; line = w;
        } else { line = next; }
      }
      if (line) page.drawText(line, { x: margin, y: margin + 30, size: 8, font, color: rgb(0.4,0.42,0.48) });
    }
    page.drawText('Merci pour votre intérêt.', { x: margin, y: margin + 16, size: 10, font, color: rgb(0.35,0.37,0.42) });

    const pdfBytes = await pdfDoc.save();
    const arrayBuffer: ArrayBuffer = (pdfBytes as Uint8Array).buffer.slice(
      (pdfBytes as Uint8Array).byteOffset,
      (pdfBytes as Uint8Array).byteOffset + (pdfBytes as Uint8Array).byteLength
    ) as ArrayBuffer
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="devis-${quote.number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Erreur génération PDF devis:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
