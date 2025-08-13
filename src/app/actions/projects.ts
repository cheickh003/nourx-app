'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  totalMilestones: number;
  completedMilestones: number;
  totalDocuments: number;
  recentMilestones: Array<{
    id: string;
    title: string;
    status: string;
    due_date: string;
  }>;
  recentDocuments: Array<{
    id: string;
    label: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assigned_to: string | null;
  }>;
}

export async function getProjectStats(projectId: string): Promise<{ data: ProjectStats | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    // Vérifier l'accès au projet via RLS
    const { data: projectAccess } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (!projectAccess) {
      return { data: null, error: 'Accès au projet non autorisé' };
    }

    // Statistiques des tâches
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, status, priority, assigned_to')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (tasksError) throw tasksError;

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(task => task.status === 'done').length || 0;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const recentTasks = tasks?.slice(0, 5) || [];

    // Statistiques des jalons
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select('id, title, status, due_date')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (milestonesError) throw milestonesError;

    const totalMilestones = milestones?.length || 0;
    const completedMilestones = milestones?.filter(milestone => milestone.status === 'done').length || 0;
    const recentMilestones = milestones?.slice(0, 5) || [];

    // Statistiques des documents
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('id, label, mime_type, size_bytes, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (documentsError) throw documentsError;

    const totalDocuments = documents?.length || 0;
    const recentDocuments = documents?.slice(0, 5) || [];

    return {
      data: {
        totalTasks,
        completedTasks,
        progressPercentage,
        totalMilestones,
        completedMilestones,
        totalDocuments,
        recentMilestones,
        recentDocuments,
        recentTasks,
      },
      error: null,
    };
  } catch (error: unknown) {
    console.error('Error fetching project stats:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des statistiques du projet',
    };
  }
}

export async function createProject(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const client_id = formData.get('client_id') as string;
    const status = formData.get('status') as string;
    const start_date = formData.get('start_date') as string;
    const end_date = formData.get('end_date') as string;

    if (!name || !client_id) {
      return { success: false, error: 'Nom et client requis' };
    }

    const { error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        client_id,
        status: status || 'active',
        start_date: start_date || null,
        end_date: end_date || null,
      });

    if (error) throw error;

    revalidatePath('/admin/projets');
    revalidatePath('/dashboard');
    return { success: true };

  } catch (error: unknown) {
    console.error('Error creating project:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la création du projet' };
  }
}

export async function updateProject(projectId: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const status = formData.get('status') as string;
    const start_date = formData.get('start_date') as string;
    const end_date = formData.get('end_date') as string;

    if (!name) {
      return { success: false, error: 'Nom requis' };
    }

    const { error } = await supabase
      .from('projects')
      .update({
        name,
        description,
        status,
        start_date: start_date || null,
        end_date: end_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (error) throw error;

    revalidatePath('/admin/projets');
    revalidatePath('/dashboard');
    revalidatePath('/projet');
    return { success: true };

  } catch (error: unknown) {
    console.error('Error updating project:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du projet' };
  }
}

export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;

    revalidatePath('/admin/projets');
    revalidatePath('/dashboard');
    return { success: true };

  } catch (error: unknown) {
    console.error('Error deleting project:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la suppression du projet' };  
  }
}

export interface ProjectListRow {
  id: string
  client_id: string
  name: string
  status?: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  created_at: string
  clients?: { id: string; name: string } | null
}

export async function getAllProjects(): Promise<{ data: ProjectListRow[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: projects as ProjectListRow[], error: null };

  } catch (error: unknown) {
    console.error('Error fetching all projects:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Erreur lors de la récupération des projets' };
  }
}

export async function getUserProjects(): Promise<{ data: ProjectListRow[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: projects as ProjectListRow[], error: null };

  } catch (error: unknown) {
    console.error('Error fetching user projects:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Erreur lors de la récupération des projets' };
  }
}
