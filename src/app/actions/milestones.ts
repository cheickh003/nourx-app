'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CreateMilestoneData, Milestone } from '@/types/database';

export async function createMilestone(data: CreateMilestoneData): Promise<{ success: boolean; data?: Milestone; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: milestone, error } = await supabase
      .from('milestones')
      .insert({
        project_id: data.project_id,
        title: data.title,
        description: data.description,
        status: data.status || 'todo',
        due_date: data.due_date,
        position: data.position || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création jalon:', error);
      return { success: false, error: 'Erreur lors de la création du jalon' };
    }

    revalidatePath(`/admin/projets`);
    revalidatePath(`/projet`);
    revalidatePath(`/feuille-de-route`);
    
    return { success: true, data: milestone };
  } catch (error) {
    console.error('Erreur création jalon:', error);
    return { success: false, error: 'Erreur lors de la création du jalon' };
  }
}

export async function updateMilestone(id: string, data: Partial<CreateMilestoneData>): Promise<{ success: boolean; data?: Milestone; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: milestone, error } = await supabase
      .from('milestones')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour jalon:', error);
      return { success: false, error: 'Erreur lors de la mise à jour du jalon' };
    }

    revalidatePath(`/admin/projets`);
    revalidatePath(`/projet`);
    revalidatePath(`/feuille-de-route`);
    
    return { success: true, data: milestone };
  } catch (error) {
    console.error('Erreur mise à jour jalon:', error);
    return { success: false, error: 'Erreur lors de la mise à jour du jalon' };
  }
}

export async function deleteMilestone(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur suppression jalon:', error);
      return { success: false, error: 'Erreur lors de la suppression du jalon' };
    }

    revalidatePath(`/admin/projets`);
    revalidatePath(`/projet`);
    revalidatePath(`/feuille-de-route`);
    
    return { success: true };
  } catch (error) {
    console.error('Erreur suppression jalon:', error);
    return { success: false, error: 'Erreur lors de la suppression du jalon' };
  }
}

export async function getMilestones(projectId: string): Promise<{ success: boolean; data?: Milestone[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: milestones, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Erreur récupération jalons:', error);
      return { success: false, error: 'Erreur lors de la récupération des jalons' };
    }

    return { success: true, data: milestones || [] };
  } catch (error) {
    console.error('Erreur récupération jalons:', error);
    return { success: false, error: 'Erreur lors de la récupération des jalons' };
  }
}
