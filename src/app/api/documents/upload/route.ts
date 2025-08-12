import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    // Récupérer les données du formulaire
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const label = formData.get('label') as string;

    if (!file || !projectId || !label) {
      return NextResponse.json(
        { error: 'Fichier, ID du projet et libellé requis' },
        { status: 400 }
      );
    }

    // Récupérer le rôle
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // Vérifier l'accès au projet (admin = bypass, sinon membre requis)
    if (profile?.role === 'admin') {
      const { data: exists, error: projErr } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();
      if (projErr || !exists) {
        return NextResponse.json(
          { error: 'Projet introuvable' },
          { status: 404 }
        );
      }
    } else {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          id,
          client_id,
          client_members!inner(user_id)
        `)
        .eq('id', projectId)
        .eq('client_members.user_id', user.id)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { error: 'Projet non trouvé ou accès refusé' },
          { status: 403 }
        );
      }
    }

    // Générer un nom de fichier unique
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storagePath = `project-${projectId}/${uniqueFileName}`;

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erreur upload Storage:', uploadError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload du fichier' },
        { status: 500 }
      );
    }

    // Créer l'enregistrement dans la table documents
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        label: label,
        storage_bucket: 'project-files',
        storage_path: storagePath,
        mime_type: file.type,
        size_bytes: file.size,
        visibility: 'private',
        created_by: user.id
      })
      .select()
      .single();

    if (documentError) {
      console.error('Erreur création document:', documentError);
      
      // Supprimer le fichier uploadé en cas d'erreur
      await supabase.storage
        .from('project-files')
        .remove([storagePath]);

      return NextResponse.json(
        { error: 'Erreur lors de la création du document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Erreur upload document:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'upload' },
      { status: 500 }
    );
  }
}
