"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return { ok: false, message: "Non authentifié" }
  }

  const fullName = (formData.get("full_name") as string | null) ?? null
  const phone = (formData.get("phone") as string | null) ?? null
  const redirectTo = (formData.get("redirectTo") as string) || "/parametres"

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("user_id", user.id)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath(redirectTo)
  return { ok: true, message: "Profil mis à jour" }
}

export async function updateEmail(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Non authentifié" }

  const email = (formData.get("email") as string | null) ?? null
  const redirectTo = (formData.get("redirectTo") as string) || "/parametres"
  if (!email) return { ok: false, message: "Email requis" }

  const { error } = await supabase.auth.updateUser({ email })
  if (error) return { ok: false, message: error.message }

  revalidatePath(redirectTo)
  return { ok: true, message: "Email mis à jour. Vérifiez votre boîte mail pour confirmer." }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Non authentifié" }

  const password = (formData.get("password") as string | null) ?? null
  const passwordConfirm = (formData.get("password_confirm") as string | null) ?? null
  const redirectTo = (formData.get("redirectTo") as string) || "/parametres"

  if (!password || password.length < 8) {
    return { ok: false, message: "Mot de passe trop court (min 8)" }
  }
  if (password !== passwordConfirm) {
    return { ok: false, message: "Les mots de passe ne correspondent pas" }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, message: error.message }

  revalidatePath(redirectTo)
  return { ok: true, message: "Mot de passe mis à jour" }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Non authentifié" }

  const file = formData.get("avatar") as File | null
  const redirectTo = (formData.get("redirectTo") as string) || "/parametres"
  if (!file || file.size === 0) return { ok: false, message: "Fichier requis" }
  if (!file.type.startsWith("image/")) return { ok: false, message: "Format non supporté" }
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "Image trop lourde (max 5MB)" }

  const ext = file.name.split(".").pop() || "jpg"
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { cacheControl: "3600" })

  if (uploadError) return { ok: false, message: uploadError.message }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path)

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("user_id", user.id)

  if (profileError) return { ok: false, message: profileError.message }

  revalidatePath(redirectTo)
  return { ok: true, message: "Avatar mis à jour" }
}

export async function updatePreferences(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Non authentifié" }

  const notifyEmail = formData.get("notify_email") === "on" || formData.get("notify_email") === "true"
  const redirectTo = (formData.get("redirectTo") as string) || "/parametres"

  const { error } = await supabase
    .from("profiles")
    .update({ preferences: { notify_email: notifyEmail } })
    .eq("user_id", user.id)

  if (error) return { ok: false, message: error.message }

  revalidatePath(redirectTo)
  return { ok: true, message: "Préférences mises à jour" }
}

// ------- Organisation settings (admin)
export async function getOrgSettings() {
  const supabase = await createClient()
  const { data } = await supabase.from('org_settings').select('*').order('id', { ascending: true }).limit(1).maybeSingle()
  return data
}

export async function updateOrgSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Non authentifié' }

  const payload = {
    name: (formData.get('org_name') as string | null) ?? null,
    address: (formData.get('org_address') as string | null) ?? null,
    phone: (formData.get('org_phone') as string | null) ?? null,
    email: (formData.get('org_email') as string | null) ?? null,
    website: (formData.get('org_website') as string | null) ?? null,
    legal: (formData.get('org_legal') as string | null) ?? null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase.from('org_settings').select('id').order('id', { ascending: true }).limit(1).maybeSingle()
  let res
  if (existing?.id) {
    res = await supabase.from('org_settings').update(payload).eq('id', existing.id)
  } else {
    res = await supabase.from('org_settings').insert([payload])
  }
  if (res.error) return { ok: false, message: res.error.message }
  revalidatePath('/admin/parametres')
  return { ok: true, message: 'Coordonnées organisation mises à jour' }
}

// ---------- Wrappers Server Action (retourne void pour usage <form action>)
export async function updateProfileAction(formData: FormData): Promise<void> {
  await updateProfile(formData)
}

export async function updateEmailAction(formData: FormData): Promise<void> {
  await updateEmail(formData)
}

export async function updatePasswordAction(formData: FormData): Promise<void> {
  await updatePassword(formData)
}

export async function uploadAvatarAction(formData: FormData): Promise<void> {
  await uploadAvatar(formData)
}

export async function updatePreferencesAction(formData: FormData): Promise<void> {
  await updatePreferences(formData)
}


