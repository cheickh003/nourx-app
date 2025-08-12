import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { documentId } = await context.params;

    // Récupérer les informations du document
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select(`id, storage_bucket, storage_path, projects(id, client_id)`)
      .eq('id', documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    }

    // Vérifier rôle et appartenance
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const { data: membership, error: membershipError } = await supabase
        .from('client_members')
        .select('id')
        .eq('client_id', (document as { projects: Array<{ client_id: string }> }).projects[0]?.client_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (membershipError || !membership) {
        return NextResponse.json({ error: 'Accès refusé à ce document' }, { status: 403 });
      }
    }

    // Créer une URL signée pour télécharger le fichier (valide 5 minutes)
    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from((document as { storage_bucket: string }).storage_bucket)
      .createSignedUrl((document as { storage_path: string }).storage_path, 300); // 5 minutes

    if (signedUrlError || !signedUrl) {
      console.error('Erreur création URL signée:', signedUrlError);
      return NextResponse.json(
        { error: 'Erreur lors de la génération du lien de téléchargement' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { download_url: signedUrl.signedUrl } });

  } catch (error) {
    console.error('Erreur téléchargement document:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors du téléchargement' },
      { status: 500 }
    );
  }
}
