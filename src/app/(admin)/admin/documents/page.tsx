import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, FileText, Search, Target, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DocumentPageActions } from './document-page-actions';
import { DocumentCreateDialog } from '@/components/admin/document-create-dialog';
import { DocumentEditActions } from '@/components/admin/document-edit-actions';
export const dynamic = 'force-dynamic'

async function getDocumentsPage(page: number, pageSize: number) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const query = supabase
    .from('documents')
    .select(`
      *,
      projects (
        id,
        name,
        clients (
          id,
          name
        )
      ),
      profiles!documents_created_by_fkey (
        user_id,
        first_name,
        last_name
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await query
  if (error) throw error
  return { rows: data || [], total: count || 0 }
}

async function getDocumentStats() {
  const supabase = await createClient();
  
  const { data: allDocs } = await supabase
    .from('documents')
    .select('id, size_bytes, visibility');
  
  const total = allDocs?.length || 0;
  const totalSize = allDocs?.reduce((sum, doc) => sum + (doc.size_bytes || 0), 0) || 0;
  const privateCount = allDocs?.filter(d => d.visibility === 'private').length || 0;
  const publicCount = allDocs?.filter(d => d.visibility === 'public').length || 0;

  return { total, totalSize, privateCount, publicCount };
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default async function AdminDocumentsPage({ searchParams }: { searchParams?: Promise<{ page?: string; size?: string }> }) {
  const { page = '1', size = '25' } = (await searchParams) || {}
  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(5, parseInt(size || '25', 10) || 25))
  const [{ rows, total }, stats] = await Promise.all([
    getDocumentsPage(pageNum, pageSize),
    getDocumentStats(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Documents</h1>
          <p className="text-muted-foreground">
            Administration de tous les documents clients.
          </p>
        </div>
        <DocumentCreateDialog />
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taille totale</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
            <p className="text-xs text-muted-foreground">stockage utilisé</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Privés</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.privateCount}</div>
            <p className="text-xs text-muted-foreground">accès restreint</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publics</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.publicCount}</div>
            <p className="text-xs text-muted-foreground">accès libre</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload global */}
      <Card>
        <CardHeader>
          <CardTitle>Uploader un document</CardTitle>
          <CardDescription>Uploader un document vers un projet existant</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Utilisez l&apos;upload depuis la fiche projet pour associer un document à un projet précis.</p>
        </CardContent>
      </Card>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, projet ou client..."
                  className="pl-8"
                />
              </div>
            </div>
            <Button variant="outline">Tous les types</Button>
            <Button variant="outline">Toutes les visibilités</Button>
            <Button variant="outline">Tous les projets</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des documents (pagination simple côté client) */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({total})</CardTitle>
          <CardDescription>
            Liste de tous les documents avec leurs informations principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Aucun document trouvé.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Visibilité</TableHead>
                  <TableHead>Ajouté par</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{doc.label}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {doc.storage_path}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {doc.projects?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {doc.projects?.clients?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatFileSize(doc.size_bytes || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {doc.mime_type?.split('/')?.[1]?.toUpperCase() || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={doc.visibility === 'private' ? 'secondary' : 'default'}
                      >
                        {doc.visibility === 'private' ? 'Privé' : 'Public'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.profiles ? (
                        <div className="text-sm">
                          {doc.profiles.first_name} {doc.profiles.last_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(doc.created_at), 'd MMM yyyy', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DocumentPageActions document={doc} />
                        <DocumentEditActions document={{ id: doc.id, label: doc.label, visibility: doc.visibility }} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">Page {pageNum} / {Math.ceil(total / pageSize)}</span>
              <div className="flex items-center gap-2">
                <a className="btn btn-sm border px-3 py-1 rounded" href={`?page=${Math.max(1, pageNum - 1)}&size=${pageSize}`}>Précédent</a>
                <a className="btn btn-sm border px-3 py-1 rounded" href={`?page=${pageNum + 1}&size=${pageSize}`}>Suivant</a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
