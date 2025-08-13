import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getMilestones } from '@/app/actions/milestones';
import { MilestoneTimeline } from '@/components/milestones/milestone-timeline';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Calendar } from 'lucide-react';

async function RoadmapContent() {
  const supabase = await createClient();
  
  // Vérifier l'authentification
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/sign-in');
  }

  // Récupérer le profil utilisateur
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    redirect('/auth/sign-in');
  }

  // Récupérer le premier projet de l'utilisateur
  const { data: clientMembership } = await supabase
    .from('client_members')
    .select(`
      client_id,
      clients!inner(
        id,
        name,
        projects(*)
      )
    `)
    .eq('user_id', user.id)
    .single();

  if (!clientMembership?.clients) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Feuille de Route</h1>
          <p className="text-muted-foreground">
            Planification et jalons de votre projet.
          </p>
        </div>
        
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun projet trouvé
            </h3>
            <p className="text-gray-500">
              Contactez votre équipe pour être ajouté à un projet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientData = clientMembership.clients as unknown as { id: string; name: string; projects?: { id: string; name: string }[] } | null
  if (!clientData || !Array.isArray(clientData.projects) || clientData.projects.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Feuille de Route</h1>
          <p className="text-muted-foreground">
            Planification et jalons de votre projet.
          </p>
        </div>
        
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun projet trouvé
            </h3>
            <p className="text-gray-500">
              Contactez votre équipe pour être ajouté à un projet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = clientData.projects[0];
  
  // Récupérer les jalons du projet
  const milestonesResult = await getMilestones(project.id);
  const milestones = milestonesResult.success ? milestonesResult.data || [] : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feuille de Route</h1>
          <p className="text-muted-foreground">
            Projet: {project.name} • {milestones.length} jalon(s)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">Timeline</span>
        </div>
      </div>

      <MilestoneTimeline milestones={milestones} />
    </div>
  );
}

function RoadmapLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-6">
            <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
            <Card className="flex-1">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeuilleDeRoutePage() {
  return (
    <Suspense fallback={<RoadmapLoading />}>
      <RoadmapContent />
    </Suspense>
  );
}
