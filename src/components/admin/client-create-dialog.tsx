'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClientAction } from '@/app/actions/clients';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ClientCreateDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    const { success } = await createClientAction(formData);
    setIsLoading(false);
    if (success) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un client</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Email de contact</Label>
            <Input id="contact_email" name="contact_email" type="email" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input id="create_user_contact" name="create_user_contact" type="checkbox" className="h-4 w-4" />
              <Label htmlFor="create_user_contact">Créer un compte utilisateur pour ce contact</Label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="user_email">Email utilisateur (optionnel)</Label>
                <Input id="user_email" name="user_email" type="email" placeholder="Par défaut: email de contact" />
              </div>
              <div>
                <Label htmlFor="user_full_name">Nom complet (optionnel)</Label>
                <Input id="user_full_name" name="user_full_name" placeholder="Par défaut: nom du client" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Un mot de passe temporaire sera envoyé par e-mail si coché.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Création...' : 'Créer'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


