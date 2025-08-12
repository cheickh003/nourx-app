'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CreateChecklistItemData, TaskChecklistItem } from '@/types/database';

export async function createChecklistItem(data: CreateChecklistItemData): Promise<{ success: boolean; data?: TaskChecklistItem; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: item, error } = await supabase
      .from('task_checklist_items')
      .insert({
        task_id: data.task_id,
        label: data.label,
        position: data.position || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création élément checklist:', error);
      return { success: false, error: 'Erreur lors de la création de l\'élément' };
    }

    revalidatePath(`/admin/taches`);
    revalidatePath(`/taches`);
    
    return { success: true, data: item };
  } catch (error) {
    console.error('Erreur création élément checklist:', error);
    return { success: false, error: 'Erreur lors de la création de l\'élément' };
  }
}

export async function updateChecklistItem(id: string, updates: Partial<Omit<TaskChecklistItem, 'id' | 'task_id' | 'created_at' | 'updated_at'>>): Promise<{ success: boolean; data?: TaskChecklistItem; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: item, error } = await supabase
      .from('task_checklist_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour élément checklist:', error);
      return { success: false, error: 'Erreur lors de la mise à jour de l\'élément' };
    }

    revalidatePath(`/admin/taches`);
    revalidatePath(`/taches`);
    
    return { success: true, data: item };
  } catch (error) {
    console.error('Erreur mise à jour élément checklist:', error);
    return { success: false, error: 'Erreur lors de la mise à jour de l\'élément' };
  }
}

export async function toggleChecklistItem(id: string): Promise<{ success: boolean; data?: TaskChecklistItem; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // D'abord récupérer l'état actuel
    const { data: currentItem, error: fetchError } = await supabase
      .from('task_checklist_items')
      .select('is_done')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Erreur récupération élément checklist:', fetchError);
      return { success: false, error: 'Erreur lors de la récupération de l\'élément' };
    }

    // Inverser l'état
    const { data: item, error } = await supabase
      .from('task_checklist_items')
      .update({ is_done: !currentItem.is_done })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur basculement élément checklist:', error);
      return { success: false, error: 'Erreur lors du basculement de l\'élément' };
    }

    // Pas de revalidatePath pour les toggle rapides
    return { success: true, data: item };
  } catch (error) {
    console.error('Erreur basculement élément checklist:', error);
    return { success: false, error: 'Erreur lors du basculement de l\'élément' };
  }
}

export async function deleteChecklistItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await supabase
      .from('task_checklist_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur suppression élément checklist:', error);
      return { success: false, error: 'Erreur lors de la suppression de l\'élément' };
    }

    revalidatePath(`/admin/taches`);
    revalidatePath(`/taches`);
    
    return { success: true };
  } catch (error) {
    console.error('Erreur suppression élément checklist:', error);
    return { success: false, error: 'Erreur lors de la suppression de l\'élément' };
  }
}

export async function getTaskChecklistItems(taskId: string): Promise<{ success: boolean; data?: TaskChecklistItem[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: items, error } = await supabase
      .from('task_checklist_items')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Erreur récupération éléments checklist:', error);
      return { success: false, error: 'Erreur lors de la récupération des éléments' };
    }

    return { success: true, data: items || [] };
  } catch (error) {
    console.error('Erreur récupération éléments checklist:', error);
    return { success: false, error: 'Erreur lors de la récupération des éléments' };
  }
}

export async function reorderChecklistItems(taskId: string, itemsWithPositions: { id: string; position: number }[]): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Mettre à jour les positions en lot
    const updates = itemsWithPositions.map(item => 
      supabase
        .from('task_checklist_items')
        .update({ position: item.position })
        .eq('id', item.id)
        .eq('task_id', taskId)
    );

    const results = await Promise.all(updates);
    
    // Vérifier si toutes les mises à jour ont réussi
    const hasError = results.some((result: { error?: unknown }) => result.error);
    if (hasError) {
      console.error('Erreur réorganisation éléments checklist');
      return { success: false, error: 'Erreur lors de la réorganisation des éléments' };
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur réorganisation éléments checklist:', error);
    return { success: false, error: 'Erreur lors de la réorganisation des éléments' };
  }
}
