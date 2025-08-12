'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deleteProject, updateProject } from '@/app/actions/projects';
import { useRouter } from 'next/navigation';

interface Props {
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    start_date?: string | null;
    end_date?: string | null;
  };
}

export function ProjectRowActions({ project }: Props) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const { success } = await updateProject(project.id, formData);
    if (success) {
      setOpen(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce projet ?')) return;
    setIsDeleting(true);
    const { success } = await deleteProject(project.id);
    setIsDeleting(false);
    if (success) router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Éditer</Button>
      <Button variant="ghost" size="sm" className="text-red-600" onClick={handleDelete} disabled={isDeleting}>Supprimer</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" defaultValue={project.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={project.description || ''} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Début</Label>
                <Input id="start_date" name="start_date" type="date" defaultValue={project.start_date || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fin</Label>
                <Input id="end_date" name="end_date" type="date" defaultValue={project.end_date || ''} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select name="status" defaultValue={project.status}>
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


