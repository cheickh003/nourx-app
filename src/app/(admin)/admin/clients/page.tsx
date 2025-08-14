import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientCreateDialog } from '@/components/admin/client-create-dialog';
import { ClientEditActions } from '@/components/admin/client-edit-actions';
// import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Search, User, Target /*, Plus*/ } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const dynamic = 'force-dynamic'

async function getAllClients() {
  const supabase = await createClient();
  
  const { data: clients, error } = await supabase
    .from('clients')
    .select(`
      *,
      projects (id),
      client_members (
        profiles (
          user_id,
          first_name,
          last_name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return clients || [];
}

async function getClientStats() {
  const supabase = await createClient();
  
  const { data: allClients } = await supabase
    .from('clients')
    .select('id, status');
  
  const total = allClients?.length || 0;
  const active = allClients?.filter(c => c.status === 'active').length || 0;
  const inactive = allClients?.filter(c => c.status === 'inactive').length || 0;

  return { total, active, inactive };
}

export default async function AdminClientsPage() {
  const [clients, stats] = await Promise.all([
    getAllClients(),
    getClientStats(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Clients</h1>
          <p className="text-muted-foreground">
            Administration de tous les clients.
          </p>
        </div>
        <ClientCreateDialog />
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <User className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">en activité</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
            <User className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">suspendus</p>
          </CardContent>
        </Card>
      </div>

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
                  placeholder="Rechercher par nom ou email..."
                  className="pl-8"
                />
              </div>
            </div>
            <Button variant="outline">Tous les statuts</Button>
            <Button variant="outline">Toutes les dates</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des clients */}
      <Card>
        <CardHeader>
          <CardTitle>Clients ({clients.length})</CardTitle>
          <CardDescription>
            Liste de tous les clients avec leurs informations principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Aucun client trouvé.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Projets</TableHead>
                  <TableHead>Membres</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client: { id: string; name: string; description?: string | null; contact_email?: string | null; projects?: unknown[]; client_members?: unknown[]; created_at: string; phone?: string | null; address?: string | null; website?: string | null; legal?: string | null }) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{client.name}</div>
                        {client.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {client.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                    {client.contact_email || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {client.projects?.length || 0} projet(s)
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {client.client_members?.length || 0} membre(s)
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(client.created_at), 'd MMM yyyy', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ClientEditActions client={{ id: client.id, name: client.name, contact_email: client.contact_email, phone: client.phone ?? null, address: client.address ?? null, website: client.website ?? null, legal: client.legal ?? null }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
