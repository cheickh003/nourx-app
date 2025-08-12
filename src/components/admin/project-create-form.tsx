'use client';

import { createProject } from '@/app/actions/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ClientRow { id: string; name: string }

export function ProjectCreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setClients(data as ClientRow[]);
      });
  }, []);

  async function handleSubmit(formData: FormData) {
    // Injecter les valeurs des Select radix via inputs hidden
    formData.set('client_id', selectedClientId);
    formData.set('status', selectedStatus);

    startTransition(async () => {
      const result = await createProject(formData);
      if (result.success) {
        onSuccess?.();
      } else {
        // noop, l'appelant peut afficher un toast si nécessaire
        console.error(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* Hidden inputs pour Select radix */}
      <input type="hidden" name="client_id" value={selectedClientId} />
      <input type="hidden" name="status" value={selectedStatus} />

      <div className="space-y-2">
        <Label htmlFor="name">Nom du projet *</Label>
        <Input id="name" name="name" placeholder="Nom du projet" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" placeholder="Description du projet" rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Client *</Label>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Date de début</Label>
          <Input id="start_date" name="start_date" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Date de fin</Label>
          <Input id="end_date" name="end_date" type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="on_hold">En attente</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => onSuccess?.()}>Annuler</Button>
        <Button type="submit" disabled={isPending}>{isPending ? 'Création...' : 'Créer le projet'}</Button>
      </div>
    </form>
  );
}
