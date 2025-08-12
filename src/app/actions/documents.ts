'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Document, CreateDocumentData } from '@/types/database';

export async function getProjectDocuments(projectId: string): Promise<{ success: boolean; data?: Document[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération documents:', error);
      return { success: false, error: 'Erreur lors de la récupération des documents' };
    }

    return { success: true, data: documents || [] };
  } catch (error) {
    console.error('Erreur récupération documents:', error);
    return { success: false, error: 'Erreur lors de la récupération des documents' };
  }
}

export async function createDocument(data: CreateDocumentData): Promise<{ success: boolean; data?: Document; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        project_id: data.project_id,
        label: data.label,
        storage_bucket: 'project-files',
        storage_path: data.storage_path,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes,
        visibility: data.visibility || 'private',
        created_by: user.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création document:', error);
      return { success: false, error: 'Erreur lors de la création du document' };
    }

    revalidatePath(`/admin/projets`);
    revalidatePath(`/documents`);
    revalidatePath(`/admin/documents`);
    
    return { success: true, data: document };
  } catch (error) {
    console.error('Erreur création document:', error);
    return { success: false, error: 'Erreur lors de la création du document' };
  }
}

export async function updateDocument(id: string, updates: Partial<Pick<Document, 'label' | 'visibility'>>): Promise<{ success: boolean; data?: Document; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier les permissions - seul le créateur ou un admin peut modifier
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.user.id)
      .single();

    let updateQuery = supabase
      .from('documents')
      .update(updates)
      .eq('id', id);

    // Si ce n'est pas un admin, limiter aux documents créés par l'utilisateur
    if (profile?.role !== 'admin') {
      updateQuery = updateQuery.eq('created_by', user.user.id);
    }

    const { data: document, error } = await updateQuery.select().single();

    if (error) {
      console.error('Erreur mise à jour document:', error);
      return { success: false, error: 'Erreur lors de la mise à jour du document' };
    }

    revalidatePath(`/admin/projets`);
    revalidatePath(`/documents`);
    revalidatePath(`/admin/documents`);
    
    return { success: true, data: document };
  } catch (error) {
    console.error('Erreur mise à jour document:', error);
    return { success: false, error: 'Erreur lors de la mise à jour du document' };
  }
}

export async function deleteDocument(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Récupérer les informations du document avant suppression
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('storage_bucket, storage_path, created_by')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return { success: false, error: 'Document non trouvé' };
    }

    // Vérifier les permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.user.id)
      .single();

    const canDelete = profile?.role === 'admin' || document.created_by === user.user.id;

    if (!canDelete) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Supprimer l'enregistrement de la base de données
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erreur suppression document:', deleteError);
      return { success: false, error: 'Erreur lors de la suppression du document' };
    }

    // Supprimer le fichier du storage
    const { error: storageError } = await supabase.storage
      .from(document.storage_bucket)
      .remove([document.storage_path]);

    if (storageError) {
      console.error('Erreur suppression fichier storage:', storageError);
      // On continue même si la suppression du fichier échoue
    }

    revalidatePath(`/admin/projets`);
    revalidatePath(`/documents`);
    revalidatePath(`/admin/documents`);
    
    return { success: true };
  } catch (error) {
    console.error('Erreur suppression document:', error);
    return { success: false, error: 'Erreur lors de la suppression du document' };
  }
}

export async function getDocumentDownloadUrl(documentId: string): Promise<{ success: boolean; data?: { download_url: string; document: Partial<Document> }; error?: string }> {
  try {
    // Cette fonction utilise l'API route pour obtenir l'URL signée
    const response = await fetch(`/api/documents/${documentId}/download`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Erreur lors de la génération du lien' };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Erreur génération URL téléchargement:', error);
    return { success: false, error: 'Erreur lors de la génération du lien de téléchargement' };
  }
}
