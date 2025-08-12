'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteClientAction, updateClientAction } from '@/app/actions/clients';
import { useRouter } from 'next/navigation';

interface Props {
  client: { id: string; name: string; contact_email?: string | null };
}

export function ClientEditActions({ client }: Props) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const { success } = await updateClientAction(client.id, formData);
    if (success) {
      setOpen(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce client ?')) return;
    setIsDeleting(true);
    const { success } = await deleteClientAction(client.id);
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
            <DialogTitle>Modifier le client</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" defaultValue={client.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email de contact</Label>
              <Input id="contact_email" name="contact_email" type="email" defaultValue={client.contact_email || ''} />
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


