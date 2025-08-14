'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { createQuote } from '@/app/actions/invoices';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
}

interface QuoteCreateDialogProps {
  onQuoteCreated?: () => void;
}

export function QuoteCreateDialog({ onQuoteCreated }: QuoteCreateDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const router = useRouter();
  const [formData, setFormData] = useState({
    client_id: '',
    project_id: '',
    currency: 'XOF',
    total_ht: 0,
    total_tva: 0,
    total_ttc: 0,
    expires_at: '',
  });

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    
    // Charger les clients
    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => setClients((data as Client[]) || []));
      
    // Charger les projets
    supabase
      .from('projects')
      .select('id, name, client_id')
      .order('name')
      .then(({ data }) => setProjects((data as Project[]) || []));
  }, [open]);

  const filteredProjects = selectedClientId 
    ? projects.filter(p => p.client_id === selectedClientId)
    : projects;

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      project_id: '' // Reset project when client changes
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    setIsSubmitting(true);
    try {
      // Nettoyer les dates vides
      const cleanedData = {
        ...formData,
        expires_at: formData.expires_at || undefined,
      };
      const result = await createQuote(cleanedData);
      if (result.success) {
        toast.success('Devis créé avec succès');
        setOpen(false);
        setFormData({
          client_id: '',
          project_id: '',
          currency: 'XOF',
          total_ht: 0,
          total_tva: 0,
          total_ttc: 0,
          expires_at: '',
        });
        setSelectedClientId('');
        onQuoteCreated?.();
        router.refresh();
      } else {
        toast.error(result.error || 'Erreur lors de la création du devis');
      }
    } catch (error) {
      console.error('Erreur création devis:', error);
      toast.error('Erreur lors de la création du devis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Devis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un nouveau devis</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={selectedClientId} onValueChange={handleClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Projet (optionnel)</Label>
            <Select 
              value={formData.project_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un projet" />
              </SelectTrigger>
              <SelectContent>
                {filteredProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select 
                value={formData.currency} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XOF">XOF (CFA)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date d&apos;expiration</Label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Total HT</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.total_ht}
                onChange={(e) => setFormData(prev => ({ ...prev, total_ht: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Total TVA</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.total_tva}
                onChange={(e) => setFormData(prev => ({ ...prev, total_tva: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Total TTC</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.total_ttc}
                onChange={(e) => setFormData(prev => ({ ...prev, total_ttc: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le devis
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
