'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CreateCommentData, TaskComment, CommentWithAuthor } from '@/types/database';

export async function createTaskComment(data: CreateCommentData): Promise<{ success: boolean; data?: TaskComment; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: comment, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: data.task_id,
        author_id: user.user.id,
        body: data.body
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création commentaire:', error);
      return { success: false, error: 'Erreur lors de la création du commentaire' };
    }

    revalidatePath(`/admin/taches`);
    revalidatePath(`/taches`);
    
    return { success: true, data: comment };
  } catch (error) {
    console.error('Erreur création commentaire:', error);
    return { success: false, error: 'Erreur lors de la création du commentaire' };
  }
}

export async function updateTaskComment(id: string, body: string): Promise<{ success: boolean; data?: TaskComment; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: comment, error } = await supabase
      .from('task_comments')
      .update({ body })
      .eq('id', id)
      .eq('author_id', user.user.id) // S'assurer que l'utilisateur ne peut modifier que ses commentaires
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour commentaire:', error);
      return { success: false, error: 'Erreur lors de la mise à jour du commentaire' };
    }

    revalidatePath(`/admin/taches`);
    revalidatePath(`/taches`);
    
    return { success: true, data: comment };
  } catch (error) {
    console.error('Erreur mise à jour commentaire:', error);
    return { success: false, error: 'Erreur lors de la mise à jour du commentaire' };
  }
}

export async function deleteTaskComment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier les permissions (admin peut supprimer tous les commentaires, utilisateur seulement les siens)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.user.id)
      .single();

    const deleteQuery = supabase
      .from('task_comments')
      .delete()
      .eq('id', id);

    // Si ce n'est pas un admin, limiter à ses propres commentaires
    if (profile?.role !== 'admin') {
      deleteQuery.eq('author_id', user.user.id);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('Erreur suppression commentaire:', error);
      return { success: false, error: 'Erreur lors de la suppression du commentaire' };
    }

    revalidatePath(`/admin/taches`);
    revalidatePath(`/taches`);
    
    return { success: true };
  } catch (error) {
    console.error('Erreur suppression commentaire:', error);
    return { success: false, error: 'Erreur lors de la suppression du commentaire' };
  }
}

export async function getTaskComments(taskId: string): Promise<{ success: boolean; data?: CommentWithAuthor[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: comments, error } = await supabase
      .from('task_comments')
      .select(`
        *,
        author:profiles(user_id, full_name, role)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur récupération commentaires:', error);
      return { success: false, error: 'Erreur lors de la récupération des commentaires' };
    }

    return { success: true, data: comments || [] };
  } catch (error) {
    console.error('Erreur récupération commentaires:', error);
    return { success: false, error: 'Erreur lors de la récupération des commentaires' };
  }
}
