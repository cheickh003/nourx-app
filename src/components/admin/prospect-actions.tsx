'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createProspect, updateProspect, deleteProspect } from '@/app/actions/prospects';
import { convertProspectToClient } from '@/app/actions/prospects';
import { useRouter } from 'next/navigation';

interface Props {
  prospect?: {
    id?: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
    status?: 'new' | 'contacted' | 'qualified';
    source?: string | null;
    notes?: string | null;
  };
}

export function ProspectCreateButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const { success } = await createProspect(formData);
    if (success) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>Nouveau prospect</Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un prospect</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Nom</Label>
            <Input name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="email" type="email" />
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input name="phone" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select name="status" defaultValue="new">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nouveau</SelectItem>
                  <SelectItem value="contacted">Contacté</SelectItem>
                  <SelectItem value="qualified">Qualifié</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Source</Label>
              <Input name="source" placeholder="website, referral, linkedin..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea name="notes" rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProspectRowActions({ prospect }: Props) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    if (!prospect?.id) return;
    const { success } = await updateProspect(prospect.id, formData);
    if (success) {
      setOpen(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!prospect?.id) return;
    if (!confirm('Supprimer ce prospect ?')) return;
    setIsDeleting(true);
    const { success } = await deleteProspect(prospect.id);
    setIsDeleting(false);
    if (success) router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Éditer</Button>
      <Button variant="ghost" size="sm" onClick={async () => {
        if (!prospect?.id) return;
        const ok = confirm('Convertir ce prospect en client ?');
        if (!ok) return;
        const res = await convertProspectToClient(prospect.id);
        if (res.success) router.refresh();
      }}>Convertir</Button>
      <Button variant="ghost" size="sm" className="text-red-600" onClick={handleDelete} disabled={isDeleting}>Supprimer</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le prospect</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Nom</Label>
              <Input name="name" defaultValue={prospect?.name} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={prospect?.email || ''} />
              </div>
              <div className="space-y-1">
                <Label>Téléphone</Label>
                <Input name="phone" defaultValue={prospect?.phone || ''} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Statut</Label>
                <Select name="status" defaultValue={prospect?.status || 'new'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="contacted">Contacté</SelectItem>
                    <SelectItem value="qualified">Qualifié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Source</Label>
                <Input name="source" defaultValue={prospect?.source || ''} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea name="notes" rows={3} defaultValue={prospect?.notes || ''} />
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


