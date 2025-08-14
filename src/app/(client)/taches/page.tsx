import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTasks } from '@/app/actions/tasks';
import { RealtimeKanbanBoard } from '@/components/kanban/realtime-kanban-board';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Kanban } from 'lucide-react';

async function TasksContent() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/auth/sign-in');
  }

  // Exécuter les requêtes en parallèle
  const [profileResult, clientMembershipResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('client_members').select(`
      client_id,
      clients!inner(
        id,
        name,
        projects(id, name)
      )
    `)
    .eq('user_id', user.id)
    .single()
  ]);

  const { data: profile } = profileResult;
  if (!profile) {
    return redirect('/auth/sign-in');
  }

  const { data: clientMembership } = clientMembershipResult;
  if (!clientMembership?.clients) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Tâches</h1>
          <p className="text-muted-foreground">
            Suivi des tâches et activités de votre projet.
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

  const clientData = clientMembership.clients as unknown as { id: string; name: string; projects?: { id: string; name: string }[] } | null;
  const project = clientData?.projects?.[0];

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Tâches</h1>
          <p className="text-muted-foreground">
            Suivi des tâches et activités de votre projet.
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
  
  // Récupérer les tâches du projet
  const tasksResult = await getTasks(project.id);
  const tasks = tasksResult.success ? tasksResult.data || [] : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tâches</h1>
          <p className="text-muted-foreground">
            Projet: {project.name} • {tasks.length} tâche(s)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Kanban className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">Vue Kanban</span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Kanban className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune tâche assignée
            </h3>
            <p className="text-gray-500">
              Les tâches du projet apparaîtront ici dès qu&apos;elles seront créées.
            </p>
          </CardContent>
        </Card>
      ) : (
        <RealtimeKanbanBoard 
          initialTasks={tasks}
          projectId={project.id}
        />
      )}
    </div>
  );
}

function TasksLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      <div className="grid grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-20 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function TachesPage() {
  return (
    <Suspense fallback={<TasksLoading />}>
      <TasksContent />
    </Suspense>
  );
}
