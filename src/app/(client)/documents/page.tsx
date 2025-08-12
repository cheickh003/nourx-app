'use client';

import { Suspense, useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { getProjectDocuments } from '@/app/actions/documents';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList } from '@/components/documents/document-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Upload, FolderOpen } from 'lucide-react';
import { Document } from '@/types/database';
import { toast } from 'sonner';

function DocumentsContent() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Vérifier l'authentification
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push('/auth/sign-in');
          return;
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

        if (!clientMembership?.clients || !Array.isArray(clientMembership.clients)) {
          setIsLoading(false);
          return;
        }

        const clientData = clientMembership.clients[0];
        if (!clientData?.projects || clientData.projects.length === 0) {
          setIsLoading(false);
          return;
        }

        const project = clientData.projects[0];
        setProjectId(project.id);

        // Récupérer les documents du projet
        const documentsResult = await getProjectDocuments(project.id);
        if (documentsResult.success && documentsResult.data) {
          setDocuments(documentsResult.data);
        }
      } catch (error) {
        console.error('Erreur initialisation documents:', error);
        toast.error('Erreur lors du chargement des documents');
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [supabase, router]);

  const handleDocumentUpdate = async () => {
    if (!projectId) return;

    try {
      const documentsResult = await getProjectDocuments(projectId);
      if (documentsResult.success && documentsResult.data) {
        setDocuments(documentsResult.data);
      }
    } catch (error) {
      console.error('Erreur rafraîchissement documents:', error);
    }
  };

  if (isLoading) {
    return <DocumentsLoading />;
  }

  if (!projectId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Gestion de vos documents de projet.
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">
          Gestion de vos documents de projet • {documents.length} document(s)
        </p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Uploader
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Documents du projet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentList
                documents={documents}
                onDocumentUpdate={handleDocumentUpdate}
                canEdit={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Uploader des documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                projectId={projectId}
                onUploadComplete={handleDocumentUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocumentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<DocumentsLoading />}>
      <DocumentsContent />
    </Suspense>
  );
}
