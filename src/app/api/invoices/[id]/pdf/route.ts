import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { type Invoice, type InvoiceItem } from '@/types/database';
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

    // Récupérer la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (name, contact_email, phone),
        projects (name),
        invoice_items (*)
      `)
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // Génération PDF (pdf-lib) — Design minimaliste avec logo
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const margin = 48;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Utils
    let y = height - margin;
    const gray = rgb(0.95, 0.96, 0.98);
    const text = (str: string, x: number, size = 11, b = false, color = rgb(0, 0, 0)) => {
      page.drawText(str, { x, y, size, font: b ? bold : font, color });
      y -= size + 6;
    };
    const measure = (str: string, size: number, b = false) => (b ? bold : font).widthOfTextAtSize(str, size);
    const wrap = (str: string, maxWidth: number, size = 11, b = false): string[] => {
      const words = String(str).split(' ');
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (measure(next, size, b) > maxWidth && line) { lines.push(line); line = w; }
        else { line = next; }
      }
      if (line) lines.push(line);
      return lines;
    };

    // Charger coordonnées organisation
    const { data: org } = await supabase.from('org_settings').select('*').order('id', { ascending: true }).limit(1).maybeSingle();

    // Header band
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: gray });
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

    // Title + meta
    y = height - 120;
    page.drawText('FACTURE', { x: margin, y, size: 20, font: bold });
    const numberStr = `# ${invoice.number}`;
    page.drawText(numberStr, { x: width - margin - measure(numberStr, 12, true), y: y + 4, size: 12, font: bold });
    y -= 24;

    // Status chip (right)
    const status = String(invoice.status).toLowerCase();
    const chip = { paid: rgb(0.13, 0.71, 0.42), issued: rgb(0.16,0.52,0.95), overdue: rgb(0.93,0.27,0.27) }[status as 'paid'|'issued'|'overdue'] || rgb(0.7,0.7,0.7);
    const chipLabel = status.toUpperCase();
    const chipW = measure(chipLabel, 10, true) + 12;
    const chipX = width - margin - chipW;
    page.drawRectangle({ x: chipX, y: y + 10, width: chipW, height: 16, color: chip, opacity: 0.15 });
    page.drawText(chipLabel, { x: chipX + 6, y: y + 12, size: 10, font: bold, color: chip });

    // Info blocks (two columns)
    const clientName = (invoice as Invoice & { clients?: { name: string } }).clients?.name || 'N/A';
    const clientEmail = (invoice as Invoice & { clients?: { contact_email?: string|null } }).clients?.contact_email || '';
    const clientPhone = (invoice as Invoice & { clients?: { phone?: string|null } }).clients?.phone || '';
    const projectName = (invoice as Invoice & { projects?: { name: string } }).projects?.name || 'N/A';
    const leftX = margin; const rightX = width/2 + 10;
    const infoY = y;
    y = infoY;
    text('Client', leftX, 10, true, rgb(0.4,0.42,0.48));
    for (const ln of wrap(clientName, (width/2 - margin) - 10, 12)) { page.drawText(ln, { x: leftX, y, size: 12, font }); y -= 16; }
    if (clientEmail || clientPhone) {
      const line = [clientPhone, clientEmail].filter(Boolean).join(' · ')
      page.drawText(line, { x: leftX, y, size: 11, font, color: rgb(0.35,0.37,0.42) }); y -= 16;
    }
    text('Projet', leftX, 10, true, rgb(0.4,0.42,0.48));
    for (const ln of wrap(projectName, (width/2 - margin) - 10, 12)) { page.drawText(ln, { x: leftX, y, size: 12, font }); y -= 18; }

    y = infoY;
    text("Émise le", rightX, 10, true, rgb(0.4,0.42,0.48));
    page.drawText(new Date(invoice.created_at).toLocaleDateString('fr-FR'), { x: rightX, y, size: 12, font }); y -= 18;
    if (invoice.due_date) {
      text("Échéance", rightX, 10, true, rgb(0.4,0.42,0.48));
      page.drawText(new Date(invoice.due_date).toLocaleDateString('fr-FR'), { x: rightX, y, size: 12, font }); y -= 18;
    }
    if (invoice.external_ref) {
      text('Réf externe', rightX, 10, true, rgb(0.4,0.42,0.48));
      page.drawText(String(invoice.external_ref), { x: rightX, y, size: 12, font }); y -= 18;
    }

    y -= 8;
    // Items table header
    const tableX = margin, tableW = width - margin*2;
    const cols = [0, 280, 360, 420, 500]; // relative to tableX
    page.drawRectangle({ x: tableX, y: y + 18, width: tableW, height: 24, color: gray });
    page.drawText('Désignation', { x: tableX + 8, y: y + 24, size: 10, font: bold, color: rgb(0.25,0.28,0.35) });
    page.drawText('Qté', { x: tableX + cols[1] + 8, y: y + 24, size: 10, font: bold });
    page.drawText('PU', { x: tableX + cols[2] + 8, y: y + 24, size: 10, font: bold });
    page.drawText('TVA', { x: tableX + cols[3] + 8, y: y + 24, size: 10, font: bold });
    page.drawText('Total', { x: tableX + cols[4] + 8, y: y + 24, size: 10, font: bold });
    y -= 12;

    const items = (invoice as Invoice & { invoice_items?: InvoiceItem[] }).invoice_items || [];
    if (items.length === 0) {
      y -= 20; page.drawText('Aucun élément.', { x: tableX + 8, y, size: 11, font }); y -= 8;
    } else {
      for (const it of items) {
        const rowTop = y + 16;
        // Désignation wrap
        const lines = wrap(String(it.label), cols[1] - 16, 11);
        for (const [i, ln] of lines.entries()) {
          page.drawText(ln, { x: tableX + 8, y: y + (lines.length-1-i)*14, size: 11, font });
        }
        // Other columns (first line only)
        page.drawText(String(it.qty), { x: tableX + cols[1] + 8, y, size: 11, font });
        page.drawText(`${Number(it.unit_price).toFixed(2)} ${invoice.currency}`, { x: tableX + cols[2] + 8, y, size: 11, font });
        page.drawText(`${it.vat_rate}%`, { x: tableX + cols[3] + 8, y, size: 11, font });
        const lineTotal = (Number(it.qty) * Number(it.unit_price)).toFixed(2);
        page.drawText(`${lineTotal} ${invoice.currency}`, { x: tableX + cols[4] + 8, y, size: 11, font });
        y -= lines.length * 14 + 6;
        // Row separator
        page.drawLine({ start: { x: tableX, y: y + 20 }, end: { x: tableX + tableW, y: y + 20 }, thickness: 0.5, color: rgb(0.88,0.9,0.92) });
        if (y < margin + 140) { // new page guard
          page = pdfDoc.addPage([595.28, 841.89]);
          y = 841.89 - margin - 120;
        }
      }
    }

    // Totals box (right)
    y -= 6;
    const boxW = 220; const boxH = 70; const boxX = width - margin - boxW; const boxY = y + 20;
    page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: rgb(0.98,0.985,0.99), opacity: 1 });
    page.drawText(`Total HT`, { x: boxX + 12, y: boxY + boxH - 18, size: 11, font: font, color: rgb(0.3,0.32,0.36) });
    page.drawText(`${Number(invoice.total_ht).toFixed(2)} ${invoice.currency}`, { x: boxX + boxW - 12 - measure(`${Number(invoice.total_ht).toFixed(2)} ${invoice.currency}`, 11), y: boxY + boxH - 18, size: 11, font });
    page.drawText(`Total TVA`, { x: boxX + 12, y: boxY + boxH - 36, size: 11, font: font, color: rgb(0.3,0.32,0.36) });
    page.drawText(`${Number(invoice.total_tva).toFixed(2)} ${invoice.currency}`, { x: boxX + boxW - 12 - measure(`${Number(invoice.total_tva).toFixed(2)} ${invoice.currency}`, 11), y: boxY + boxH - 36, size: 11, font });
    page.drawText(`Total TTC`, { x: boxX + 12, y: boxY + 14, size: 12, font: bold });
    const ttcStr = `${Number(invoice.total_ttc).toFixed(2)} ${invoice.currency}`;
    page.drawText(ttcStr, { x: boxX + boxW - 12 - measure(ttcStr, 12, true), y: boxY + 14, size: 12, font: bold });

    // Footer
    page.drawLine({ start: { x: margin, y: margin + 44 }, end: { x: width - margin, y: margin + 44 }, thickness: 0.5, color: rgb(0.88,0.9,0.92) });
    // Mentions légales wrap
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
    page.drawText('Merci pour votre confiance.', { x: margin, y: margin + 16, size: 10, font, color: rgb(0.35,0.37,0.42) });

    const pdfBytes = await pdfDoc.save();
    const arrayBuffer: ArrayBuffer = (pdfBytes as Uint8Array).buffer.slice(
      (pdfBytes as Uint8Array).byteOffset,
      (pdfBytes as Uint8Array).byteOffset + (pdfBytes as Uint8Array).byteLength
    ) as ArrayBuffer
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="facture-${invoice.number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Erreur génération PDF facture:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
