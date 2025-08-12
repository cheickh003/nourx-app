'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { updateQuote } from '@/app/actions/invoices';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Quote, QuoteStatus } from '@/types/database';

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
}

interface QuoteEditDialogProps {
  quote: Quote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoteUpdated?: () => void;
}

export function QuoteEditDialog({ quote, open, onOpenChange, onQuoteUpdated }: QuoteEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(quote.client_id);
  const [formData, setFormData] = useState({
    client_id: quote.client_id,
    project_id: quote.project_id || '',
    currency: quote.currency,
    total_ht: quote.total_ht,
    total_tva: quote.total_tva,
    total_ttc: quote.total_ttc,
    status: quote.status,
    expires_at: quote.expires_at || '',
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

  useEffect(() => {
    if (open) {
      setSelectedClientId(quote.client_id);
      setFormData({
        client_id: quote.client_id,
        project_id: quote.project_id || '',
        currency: quote.currency,
        total_ht: quote.total_ht,
        total_tva: quote.total_tva,
        total_ttc: quote.total_ttc,
        status: quote.status,
        expires_at: quote.expires_at || '',
      });
    }
  }, [quote, open]);

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
      const result = await updateQuote(quote.id, formData);
      if (result.success) {
        toast.success('Devis mis à jour avec succès');
        onOpenChange(false);
        onQuoteUpdated?.();
      } else {
        toast.error(result.error || 'Erreur lors de la mise à jour du devis');
      }
    } catch (error) {
      console.error('Erreur mise à jour devis:', error);
      toast.error('Erreur lors de la mise à jour du devis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le devis {quote.number}</DialogTitle>
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

          <div className="space-y-2">
            <Label>Statut</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as QuoteStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="sent">Envoyé</SelectItem>
                <SelectItem value="accepted">Accepté</SelectItem>
                <SelectItem value="rejected">Refusé</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
                <SelectItem value="canceled">Annulé</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mettre à jour
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
