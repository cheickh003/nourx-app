import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Utilisateur connecté, vérifier son rôle
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role === 'admin') {
      redirect('/admin/projets');
    } else {
      redirect('/dashboard');
    }
  }

  // Utilisateur non connecté - afficher la page d'accueil
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">NOURX</CardTitle>
          <CardDescription className="text-lg">
            Plateforme de gestion de projets clients
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Gérez vos projets, suivez l&apos;avancement, collaborez avec vos équipes 
            et accédez à tous vos documents en un seul endroit.
          </p>
          
          <div className="space-y-4">
            <Button asChild className="w-full" size="lg">
              <Link href="/auth/sign-in">
                Se connecter
              </Link>
            </Button>
            
            {/* Section de démonstration retirée */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
