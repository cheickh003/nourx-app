import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as { label?: string; visibility?: 'private' | 'public' }
    const updates: Record<string, unknown> = {}
    if (typeof body.label === 'string') updates.label = body.label
    if (body.visibility === 'private' || body.visibility === 'public') updates.visibility = body.visibility

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune mise à jour fournie' }, { status: 400 })
    }

    // Vérifier permissions: admin peut tout; sinon, restreindre aux documents créés par l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const { id } = await context.params
    let query = supabase.from('documents').update(updates).eq('id', id)
    if (profile?.role !== 'admin') {
      query = query.eq('created_by', user.id)
    }

    const { data: updated, error } = await query.select().single()
    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Erreur PATCH /api/documents/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer infos du document
    const { id } = await context.params
    const { data: doc, error: fetchErr } = await supabase
      .from('documents')
      .select('id, storage_bucket, storage_path, created_by')
      .eq('id', id)
      .single()

    if (fetchErr || !doc) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    // Permissions: admin ou créateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isOwner = doc.created_by === user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })
    }

    // Supprimer l'enregistrement
    const { error: deleteErr } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      return NextResponse.json({ error: 'Erreur lors de la suppression du document' }, { status: 500 })
    }

    // Supprimer le fichier du storage (on ignore l'erreur éventuelle)
    await supabase.storage
      .from(doc.storage_bucket as string)
      .remove([doc.storage_path as string])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/documents/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


