'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentList } from '@/components/documents/document-list';
import { DocumentUpload } from '@/components/documents/document-upload';
import { createClient } from '@/lib/supabase/client';
import { Document } from '@/types/database';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function ClientDocumentsContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Récupérer le projet du client connecté
  useEffect(() => {
    const fetchClientProject = async () => {
      setIsLoading(true);
      
      try {
        const supabase = createClient();
        
        // Récupérer l'utilisateur connecté
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Utilisateur non authentifié');
          setIsLoading(false);
          return;
        }
        
        // Récupérer le client associé à l'utilisateur
        const { data: clientMembers } = await supabase
          .from('client_members')
          .select('client_id')
          .eq('user_id', user.id)
          .limit(1);
          
        if (!clientMembers || clientMembers.length === 0) {
          toast.error('Aucun client associé à cet utilisateur');
          setIsLoading(false);
          return;
        }
        
        const clientId = clientMembers[0].client_id;
        
        // Récupérer le projet du client
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('client_id', clientId)
          .limit(1);
          
        if (!projects || projects.length === 0) {
          toast.error('Aucun projet trouvé pour ce client');
          setIsLoading(false);
          return;
        }
        
        const projectId = projects[0].id;
        setProjectId(projectId);
        
        // Récupérer les documents du projet
        const { data: documents } = await supabase
          .from('documents')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
          
        setDocuments(documents || []);
        
      } catch (error) {
        console.error('Erreur lors du chargement des documents:', error);
        toast.error('Erreur lors du chargement des documents');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClientProject();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleUploadComplete = () => {
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div></div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>

          {projectId && (
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Ajouter un document
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Ajouter des documents</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <DocumentUpload
                    projectId={projectId}
                    onUploadComplete={handleUploadComplete}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p>Chargement des documents...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {documents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-medium mb-2">Aucun document disponible</h3>
                <p className="text-gray-500 mb-4">
                  Aucun document n&apos;a encore été partagé pour votre projet.</p>
              </CardContent>
            </Card>
          ) : (
            <DocumentList
              documents={documents}
              onDocumentUpdate={handleRefresh}
              canEdit={true}
            />
          )}
        </>
      )}
    </div>
  )
}
