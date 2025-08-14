import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Search, User, Mail, Phone } from 'lucide-react';
import { ProspectCreateButton, ProspectRowActions } from '@/components/admin/prospect-actions';
import { createClient } from '@/lib/supabase/server';

async function getAllProspects() {
  const supabase = await createClient();
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return prospects || [];
}

type Prospect = { id: string; name: string; email: string | null; phone: string | null; status: string; source: string | null; notes: string | null; created_at: string };

function computeProspectStats(prospects: Prospect[]) {
  const total = prospects.length;
  const newProspects = prospects.filter(p => p.status === 'new').length;
  const contacted = prospects.filter(p => p.status === 'contacted').length;
  const qualified = prospects.filter(p => p.status === 'qualified').length;
  return { total, new: newProspects, contacted, qualified };
}

export default async function AdminProspectsPage() {
  const prospects = await getAllProspects();
  const stats = computeProspectStats(prospects);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Prospects</h1>
          <p className="text-muted-foreground">
            Administration de tous les prospects et leads.
          </p>
        </div>
        <ProspectCreateButton />
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">prospects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            <p className="text-xs text-muted-foreground">à traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contactés</CardTitle>
            <User className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.contacted}</div>
            <p className="text-xs text-muted-foreground">en discussion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualifiés</CardTitle>
            <User className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.qualified}</div>
            <p className="text-xs text-muted-foreground">prêts conversion</p>
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
            <Button variant="outline">Toutes les sources</Button>
            <Button variant="outline">Toutes les dates</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des prospects */}
      <Card>
        <CardHeader>
          <CardTitle>Prospects ({prospects.length})</CardTitle>
          <CardDescription>
            Liste de tous les prospects avec leurs informations principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prospect</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prospects.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell>
                    <div className="font-medium">{prospect.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {prospect.email}
                      </div>
                      {prospect.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {prospect.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {prospect.source === 'website' ? 'Site web' :
                       prospect.source === 'referral' ? 'Recommandation' :
                       prospect.source === 'linkedin' ? 'LinkedIn' : prospect.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        prospect.status === 'qualified' ? 'default' :
                        prospect.status === 'contacted' ? 'secondary' : 'outline'
                      }
                    >
                      {prospect.status === 'new' ? 'Nouveau' :
                       prospect.status === 'contacted' ? 'Contacté' :
                       prospect.status === 'qualified' ? 'Qualifié' : prospect.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {prospect.notes}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {prospect.created_at ? new Date(prospect.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ProspectRowActions prospect={prospect} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
