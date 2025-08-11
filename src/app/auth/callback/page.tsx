import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code: string }>
}) {
  const { code } = await searchParams

  if (code) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Récupérer le profil utilisateur pour déterminer la redirection
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()
        
        if (profile?.role === 'admin') {
          redirect('/admin/projets')
        } else {
          redirect('/dashboard')
        }
      }
    }
  }

  // Redirection par défaut si erreur
  redirect('/auth/sign-in')
}
