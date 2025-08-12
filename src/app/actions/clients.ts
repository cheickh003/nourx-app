'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface CreateClientInput {
  name: string;
  contact_email?: string;
}

export async function createClientAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const name = formData.get('name') as string;
    const contact_email = formData.get('contact_email') as string | null;

    if (!name) return { success: false, error: 'Nom requis' };

    const { error } = await supabase.from('clients').insert({ name, contact_email });
    if (error) throw error;

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur création client' };
  }
}

export async function updateClientAction(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const name = formData.get('name') as string;
    const contact_email = formData.get('contact_email') as string | null;

    if (!name) return { success: false, error: 'Nom requis' };

    const { error } = await supabase.from('clients').update({ name, contact_email }).eq('id', id);
    if (error) throw error;

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur mise à jour client' };
  }
}

export async function deleteClientAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/admin/clients');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur suppression client' };
  }
}


