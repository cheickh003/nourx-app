'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateDocument, deleteDocument } from '@/app/actions/documents';
import { useRouter } from 'next/navigation';

interface Props {
  document: { id: string; label: string; visibility: string };
}

export function DocumentEditActions({ document }: Props) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const label = String(formData.get('label') || '');
    const visibility = String(formData.get('visibility') || 'private');
    const { success } = await updateDocument(document.id, { label, visibility: visibility as 'private' | 'public' });
    if (success) {
      setOpen(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce document ?')) return;
    setIsDeleting(true);
    const { success } = await deleteDocument(document.id);
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
            <DialogTitle>Modifier le document</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Libellé</Label>
              <Input id="label" name="label" defaultValue={document.label} required />
            </div>
            <div className="space-y-2">
              <Label>Visibilité</Label>
              <Select name="visibility" defaultValue={document.visibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privé</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
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


