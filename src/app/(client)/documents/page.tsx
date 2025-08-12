import { Suspense } from 'react';
import { ClientDocumentsContent } from './client-documents-content';
import { Card, CardContent } from '@/components/ui/card';

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documents</h1>
      <Suspense
        fallback={
          <Card>
            <CardContent className="p-6 text-center">
              <p>Chargement des documents...</p>
            </CardContent>
          </Card>
        }
      >
        <ClientDocumentsContent />
      </Suspense>
    </div>
  );
}
