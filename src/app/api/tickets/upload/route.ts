import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'node:crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file') as File
    const ticketId = form.get('ticket_id') as string
    const label = (form.get('label') as string) || file?.name || 'Pièce jointe'

    if (!file || !ticketId) {
      return NextResponse.json({ error: 'ticket_id et fichier requis' }, { status: 400 })
    }

    // Vérifier que l'utilisateur a accès au ticket via RLS (select)
    const { data: canRead, error: tErr } = await supabase
      .from('tickets')
      .select('id, client_id')
      .eq('id', ticketId)
      .single()

    if (tErr || !canRead) {
      return NextResponse.json({ error: 'Ticket introuvable ou accès refusé' }, { status: 403 })
    }

    // Générer un chemin de fichier unique dans le bucket privé
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
    const uniqueName = `${randomUUID()}.${ext}`
    const storagePath = `tickets/${ticketId}/${uniqueName}`

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(storagePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      console.error('Upload error', uploadError)
      return NextResponse.json({ error: "Échec de l'upload" }, { status: 500 })
    }

    const { data: row, error: insErr } = await supabase
      .from('ticket_attachments')
      .insert({
        ticket_id: ticketId,
        label,
        storage_bucket: 'project-files',
        storage_path: storagePath,
        mime_type: file.type,
        size_bytes: file.size,
        created_by: user.id,
      })
      .select()
      .single()

    if (insErr) {
      console.error('ticket_attachments insert error', insErr)
      // best-effort cleanup
      await supabase.storage.from('project-files').remove([storagePath])
      return NextResponse.json({ error: 'Erreur enregistrement pièce jointe' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: row })
  } catch (error) {
    console.error('tickets upload route error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


