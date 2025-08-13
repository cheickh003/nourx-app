'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, renderSimpleTemplate } from '@/lib/email/nodemailer';

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
    const admin = createAdminClient();
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

    // Créer un utilisateur si l'email est présent
    if (prospect.email) {
      const tempPassword = generateTemporaryPassword(12);
      const { data: created, error: userErr } = await admin.auth.admin.createUser({
        email: prospect.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: prospect.name },
      });
      if (!userErr && created?.user) {
        await admin.from('client_members').insert({ user_id: created.user.id, client_id: client.id, is_primary: true });
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const subject = `[NOURX] Accès à votre espace client`;
        const html = renderSimpleTemplate(
          'Bienvenue sur NOURX',
          `Bonjour,<br/><br/>Votre compte a été créé.<br/>
           • Email: <b>${prospect.email}</b><br/>
           • Mot de passe temporaire: <b>${tempPassword}</b><br/><br/>
           Connexion: <a href="${appUrl}/auth/sign-in" style="color:#2563eb;text-decoration:none;">${appUrl}/auth/sign-in</a>`,
          { preheader: 'Vos identifiants temporaires NOURX' }
        );
        await sendEmail({ to: prospect.email, subject, html });
      }
    }

    // Optionnel: supprimer le prospect après conversion
    await supabase.from('prospects').delete().eq('id', id);

    revalidatePath('/admin/clients');
    revalidatePath('/admin/prospects');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur conversion prospect' };
  }
}

function generateTemporaryPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  let out = ''
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}


