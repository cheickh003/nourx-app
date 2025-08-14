'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CreateTaskData, Task, UpdateTaskPositionData, TaskWithDetails, TaskStatus } from '@/types/database';

export async function createTask(data: CreateTaskData): Promise<{ success: boolean; data?: Task; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Défense en profondeur: vérifier l'appartenance au projet
    const { data: authzProject } = await supabase
      .from('projects')
      .select('id')
      .eq('id', data.project_id)
      .maybeSingle();
    if (!authzProject) {
      return { success: false, error: 'Accès au projet refusé' };
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        project_id: data.project_id,
        milestone_id: data.milestone_id,
        title: data.title,
        description: data.description,
        status: data.status || 'todo',
        priority: data.priority || 'normal',
        position: data.position || 0,
        assigned_to: data.assigned_to
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création tâche:', error);
      return { success: false, error: 'Erreur lors de la création de la tâche' };
    }

    revalidatePath(`/admin/projets`);
    revalidatePath(`/taches`);
    revalidatePath(`/admin/taches`);
    
    return { success: true, data: task };
  } catch (error) {
    console.error('Erreur création tâche:', error);
    return { success: false, error: 'Erreur lors de la création de la tâche' };
  }
}

export async function updateTask(id: string, data: Partial<CreateTaskData>): Promise<{ success: boolean; data?: Task; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Charger la tâche pour déterminer son projet, puis vérifier l'accès
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id, project_id')
      .eq('id', id)
      .maybeSingle();
    if (!existingTask) {
      return { success: false, error: 'Tâche introuvable ou non autorisée' };
    }
    const targetProjectId = data.project_id ?? existingTask.project_id;
    const { data: authzProject } = await supabase
      .from('projects')
      .select('id')
      .eq('id', targetProjectId)
      .maybeSingle();
    if (!authzProject) {
      return { success: false, error: 'Accès au projet refusé' };
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour tâche:', error);
      return { success: false, error: 'Erreur lors de la mise à jour de la tâche' };
    }

    revalidatePath(`/admin/projets`);
    revalidatePath(`/taches`);
    revalidatePath(`/admin/taches`);
    
    return { success: true, data: task };
  } catch (error) {
    console.error('Erreur mise à jour tâche:', error);
    return { success: false, error: 'Erreur lors de la mise à jour de la tâche' };
  }
}

export async function updateTaskPosition(data: UpdateTaskPositionData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que l'utilisateur a accès à la tâche (via son projet)
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id, project_id')
      .eq('id', data.id)
      .maybeSingle();
    if (!existingTask) {
      return { success: false, error: 'Tâche introuvable ou non autorisée' };
    }
    const { data: authzProject } = await supabase
      .from('projects')
      .select('id')
      .eq('id', existingTask.project_id)
      .maybeSingle();
    if (!authzProject) {
      return { success: false, error: 'Accès au projet refusé' };
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        status: data.status,
        position: data.position
      })
      .eq('id', data.id);

    if (error) {
      console.error('Erreur mise à jour position tâche:', error);
      return { success: false, error: 'Erreur lors de la mise à jour de la position' };
    }

    // Pas de revalidatePath pour les drag & drop pour éviter les conflits
    return { success: true };
  } catch (error) {
    console.error('Erreur mise à jour position tâche:', error);
    return { success: false, error: 'Erreur lors de la mise à jour de la position' };
  }
}

export async function bulkReorderTasks(
  projectId: string,
  targetStatus: TaskStatus,
  orderedTaskIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier accès projet
    const { data: authzProject } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle();
    if (!authzProject) {
      return { success: false, error: 'Accès au projet refusé' };
    }

    // Construire updates positions
    const updates = orderedTaskIds.map((taskId, index) => ({ id: taskId, position: index, status: targetStatus }));

    // Mettre à jour en lot (une requête par id via upsert par clé primaire)
    const { error } = await supabase.from('tasks').upsert(updates, { onConflict: 'id' });
    if (error) {
      console.error('Erreur bulk reorder tâches:', error);
      return { success: false, error: 'Erreur lors du réordonnancement' };
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur bulk reorder tâches:', error);
    return { success: false, error: 'Erreur lors du réordonnancement' };
  }
}

export async function deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user.user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier l'accès au projet de la tâche avant suppression
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id, project_id')
      .eq('id', id)
      .maybeSingle();
    if (!existingTask) {
      return { success: false, error: 'Tâche introuvable ou non autorisée' };
    }
    const { data: authzProject } = await supabase
      .from('projects')
      .select('id')
      .eq('id', existingTask.project_id)
      .maybeSingle();
    if (!authzProject) {
      return { success: false, error: 'Accès au projet refusé' };
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur suppression tâche:', error);
      return { success: false, error: 'Erreur lors de la suppression de la tâche' };
    }

    revalidatePath(`/admin/projets`);
    revalidatePath(`/taches`);
    revalidatePath(`/admin/taches`);
    
    return { success: true };
  } catch (error) {
    console.error('Erreur suppression tâche:', error);
    return { success: false, error: 'Erreur lors de la suppression de la tâche' };
  }
}

export async function getTasks(projectId: string): Promise<{ success: boolean; data?: TaskWithDetails[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Note: l'authentification est gérée par la page appelante
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        milestone:milestones(*),
        assignee:profiles(user_id, full_name, role)
      `)
      .eq('project_id', projectId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Erreur récupération tâches:', error);
      return { success: false, error: 'Erreur lors de la récupération des tâches' };
    }

    return { success: true, data: tasks || [] };
  } catch (error) {
    console.error('Erreur récupération tâches:', error);
    return { success: false, error: 'Erreur lors de la récupération des tâches' };
  }
}

export async function getTaskById(taskId: string): Promise<{ success:boolean; data?: TaskWithDetails; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Note: l'authentification est gérée par la page appelante
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        milestone:milestones(*),
        assignee:profiles(user_id, full_name, role)
      `)
      .eq('id', taskId)
      .single();

    if (error) {
      console.error('Erreur récupération tâche:', error);
      return { success: false, error: 'Erreur lors de la récupération de la tâche' };
    }

    return { success: true, data: task };
  } catch (error) {
    console.error('Erreur récupération tâche:', error);
    return { success: false, error: 'Erreur lors de la récupération de la tâche' };
  }
}

export async function getTasksByStatus(projectId: string): Promise<{ success: boolean; data?: Record<string, TaskWithDetails[]>; error?: string }> {
  try {
    const result = await getTasks(projectId);
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    // Regrouper les tâches par statut pour le Kanban
    const tasksByStatus = result.data.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    }, {} as Record<string, TaskWithDetails[]>);

    // S'assurer que toutes les colonnes existent
    const statuses = ['todo', 'doing', 'done', 'blocked'];
    statuses.forEach(status => {
      if (!tasksByStatus[status]) {
        tasksByStatus[status] = [];
      }
    });

    return { success: true, data: tasksByStatus };
  } catch (error) {
    console.error('Erreur regroupement tâches par statut:', error);
    return { success: false, error: 'Erreur lors du regroupement des tâches' };
  }
}
