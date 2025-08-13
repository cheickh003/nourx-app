import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  updateEmail, 
  updatePassword, 
  updatePreferences, 
  updateProfile, 
  uploadAvatar,
  getOrgSettings,
  updateOrgSettings
} from "@/app/actions/settings"

export default async function AdminParametresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone, avatar_url, preferences, role")
    .eq("user_id", user?.id ?? "")
    .single()

  const org = await getOrgSettings()

  const initials =
    profile?.full_name?.split(" ")
      .map((s: string) => s[0])
      .join("")
      .toUpperCase() || "A"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres Admin</h1>
        <p className="text-muted-foreground">Configuration de votre compte administrateur.</p>
      </div>

      {/* Avatar + Identité */}
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt="Avatar" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-medium">{profile?.full_name || "Administrateur"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <form action={async (formData: FormData) => { 'use server'; await uploadAvatar(formData) }} className="flex items-end gap-4">
          <div className="grid gap-2">
            <Label htmlFor="avatar">Photo de profil</Label>
            <Input id="avatar" name="avatar" type="file" accept="image/*" />
            <input type="hidden" name="redirectTo" value="/admin/parametres" />
          </div>
          <Button type="submit">Mettre à jour l&apos;avatar</Button>
        </form>
      </div>

      {/* Profil */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Profil</h2>
        <form action={async (formData: FormData) => { 'use server'; await updateProfile(formData) }} className="grid gap-4 max-w-xl">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Nom complet</Label>
            <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} />
          </div>
          <input type="hidden" name="redirectTo" value="/admin/parametres" />
          <Button type="submit">Enregistrer</Button>
        </form>
      </div>

      {/* Sécurité */}
      <div className="rounded-lg border bg-card p-6 grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Changer d&apos;email</h2>
          <form action={async (formData: FormData) => { 'use server'; await updateEmail(formData) }} className="grid gap-4 max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="email">Nouvel email</Label>
              <Input id="email" name="email" type="email" defaultValue={user?.email ?? ""} />
            </div>
            <input type="hidden" name="redirectTo" value="/admin/parametres" />
            <Button type="submit">Mettre à jour l&apos;email</Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">Une confirmation par email peut être requise.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Changer le mot de passe</h2>
          <form action={async (formData: FormData) => { 'use server'; await updatePassword(formData) }} className="grid gap-4 max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input id="password" name="password" type="password" minLength={8} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password_confirm">Confirmer le mot de passe</Label>
              <Input id="password_confirm" name="password_confirm" type="password" minLength={8} />
            </div>
            <input type="hidden" name="redirectTo" value="/admin/parametres" />
            <Button type="submit">Mettre à jour le mot de passe</Button>
          </form>
        </div>
      </div>

      {/* Préférences */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Préférences de notification</h2>
        <form action={async (formData: FormData) => { 'use server'; await updatePreferences(formData) }} className="grid gap-4 max-w-xl">
          <div className="flex items-center gap-3">
              <input
              id="notify_email"
              name="notify_email"
              type="checkbox"
                defaultChecked={Boolean(((profile?.preferences as Record<string, unknown> | null)?.notify_email as boolean | undefined) ?? true)}
              className="h-4 w-4 rounded border-muted-foreground"
            />
            <Label htmlFor="notify_email">Recevoir les notifications par email</Label>
          </div>
          <input type="hidden" name="redirectTo" value="/admin/parametres" />
          <Button type="submit">Enregistrer</Button>
        </form>
      </div>

      {/* Coordonnées organisation (admin) */}
      {profile?.role === 'admin' && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Coordonnées société (PDF/Emails)</h2>
          <form action={async (formData: FormData) => { 'use server'; await updateOrgSettings(formData) }} className="grid gap-4 max-w-2xl">
            <div className="grid gap-2">
              <Label htmlFor="org_name">Nom</Label>
              <Input id="org_name" name="org_name" defaultValue={org?.name ?? 'NOURX'} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org_address">Adresse</Label>
              <Input id="org_address" name="org_address" defaultValue={org?.address ?? ''} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="org_phone">Téléphone</Label>
                <Input id="org_phone" name="org_phone" defaultValue={org?.phone ?? ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org_email">Email</Label>
                <Input id="org_email" name="org_email" type="email" defaultValue={org?.email ?? ''} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org_website">Site web</Label>
              <Input id="org_website" name="org_website" defaultValue={org?.website ?? ''} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org_legal">Mentions légales (pied de page PDF)</Label>
              <Input id="org_legal" name="org_legal" defaultValue={org?.legal ?? ''} />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
