'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function ensureProspectsTable(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc('noop');
}

export interface ProspectInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: 'new' | 'contacted' | 'qualified';
  source?: string | null;
  notes?: string | null;
}

export async function createProspect(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const payload: ProspectInput = {
      name: String(formData.get('name') || ''),
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      status: ((formData.get('status') as string) || 'new') as ProspectInput['status'],
      source: (formData.get('source') as string) || null,
      notes: (formData.get('notes') as string) || null,
    };
    if (!payload.name) return { success: false, error: 'Nom requis' };

    const { error } = await supabase.from('prospects').insert(payload);
    if (error) throw error;
    revalidatePath('/admin/prospects');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur création prospect' };
  }
}

export async function updateProspect(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const updates: ProspectInput = {
      name: String(formData.get('name') || ''),
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      status: ((formData.get('status') as string) || 'new') as ProspectInput['status'],
      source: (formData.get('source') as string) || null,
      notes: (formData.get('notes') as string) || null,
    };
    if (!updates.name) return { success: false, error: 'Nom requis' };
    const { error } = await supabase.from('prospects').update(updates).eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/prospects');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur mise à jour prospect' };
  }
}

export async function deleteProspect(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('prospects').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/prospects');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur suppression prospect' };
  }
}

export async function convertProspectToClient(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: prospect, error: fetchErr } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !prospect) throw fetchErr || new Error('Prospect introuvable');

    const { data: client, error: insertErr } = await supabase
      .from('clients')
      .insert({ name: prospect.name, contact_email: prospect.email })
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    // Optionnel: supprimer le prospect après conversion
    await supabase.from('prospects').delete().eq('id', id);

    revalidatePath('/admin/clients');
    revalidatePath('/admin/prospects');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur conversion prospect' };
  }
}


