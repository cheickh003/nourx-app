import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string; attachmentId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id: ticketId, attachmentId } = await context.params

    // Vérifier l'accès via RLS (sélectionner la pièce jointe)
    const { data: attachment, error: aErr } = await supabase
      .from('ticket_attachments')
      .select('storage_bucket, storage_path, ticket_id')
      .eq('id', attachmentId)
      .eq('ticket_id', ticketId)
      .single()

    if (aErr || !attachment) {
      return NextResponse.json({ error: 'Pièce jointe introuvable' }, { status: 404 })
    }

    const { data: signed, error: sErr } = await supabase.storage
      .from(attachment.storage_bucket as string)
      .createSignedUrl(attachment.storage_path as string, 600) // 10 min

    if (sErr || !signed) {
      return NextResponse.json({ error: 'Impossible de créer un lien signé' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { download_url: signed.signedUrl } })
  } catch (error) {
    console.error('ticket attachment download error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


