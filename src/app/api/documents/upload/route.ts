import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'node:crypto';
import { isAllowedUploadMime, enforceMaxSize, parseFormFields } from '@/lib/validation';
import { z } from 'zod';

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
    const fields = parseFormFields(formData, z.object({ projectId: z.string().uuid(), label: z.string().min(1).max(200) }))
    if (!fields) {
      return NextResponse.json({ error: 'Champs invalides' }, { status: 400 })
    }
    const { projectId, label } = fields

    if (!file) {
      return NextResponse.json(
        { error: 'Fichier requis' },
        { status: 400 }
      );
    }

    // Récupérer le rôle (si inaccessible, on considère non-admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // Vérifier l'accès au projet
    // - Admin: accès à tout projet lisible pour lui
    // - Client: on s'appuie sur les RLS de la table projects
    //   (si le projet n'appartient pas à son client, la requête ne retournera rien)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, client_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projet non trouvé ou accès refusé' },
        { status: 403 }
      );
    }

    // Générer un nom de fichier unique
    // Validation fichier: type et taille
    const withinSize = enforceMaxSize(10 * 1024 * 1024) // 10MB
    if (!withinSize(file.size)) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10MB)' },
        { status: 400 }
      );
    }
    if (!isAllowedUploadMime(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé' },
        { status: 400 }
      );
    }

    const fileExtension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
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
