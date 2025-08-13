'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, renderSimpleTemplate } from '@/lib/email/nodemailer';

export interface CreateClientInput {
  name: string;
  contact_email?: string;
}

export async function createClientAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const name = String(formData.get('name') || '');
    const contact_email = (formData.get('contact_email') as string) || null;
    const create_user = (formData.get('create_user_contact') as string) === 'on';
    const user_email = (formData.get('user_email') as string) || contact_email || '';
    const user_full_name = (formData.get('user_full_name') as string) || name;

    if (!name) return { success: false, error: 'Nom requis' };

    const { data: clientRow, error: insertErr } = await supabase
      .from('clients')
      .insert({ name, contact_email })
      .select('id, name, contact_email')
      .single();
    if (insertErr || !clientRow) throw insertErr || new Error('Insertion client échouée');

    // Optionnel: créer un utilisateur de contact
    if ((create_user || user_email) && user_email) {
      const tempPassword = generateTemporaryPassword(12);

      const { data: created, error: userErr } = await admin.auth.admin.createUser({
        email: user_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: user_full_name },
      });

      if (!userErr && created?.user) {
        // rattacher au client
        await admin.from('client_members').insert({
          user_id: created.user.id,
          client_id: clientRow.id,
          is_primary: true,
        });

        // Email des identifiants
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const subject = `[NOURX] Accès à votre espace client`;
        const html = renderSimpleTemplate(
          'Bienvenue sur NOURX',
          `Bonjour,<br/>Votre compte a été créé.<br/>Email: <b>${user_email}</b><br/>Mot de passe temporaire: <b>${tempPassword}</b><br/><br/>Connectez-vous: <a href="${appUrl}/auth/sign-in">${appUrl}/auth/sign-in</a>`
        );
        await sendEmail({ to: user_email, subject, html });
      }
    }

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
    const contact_email = (formData.get('contact_email') as string | null) || null;
    const phone = (formData.get('phone') as string | null) || null;
    const address = (formData.get('address') as string | null) || null;
    const website = (formData.get('website') as string | null) || null;
    const legal = (formData.get('legal') as string | null) || null;

    if (!name) return { success: false, error: 'Nom requis' };

    const { error } = await supabase.from('clients').update({ name, contact_email, phone, address, website, legal }).eq('id', id);
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

function generateTemporaryPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  let out = ''
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}


