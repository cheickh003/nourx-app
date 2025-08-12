'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { updateInvoice } from '@/app/actions/invoices';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Invoice, InvoiceStatus } from '@/types/database';

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
}

interface InvoiceEditDialogProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceUpdated?: () => void;
}

export function InvoiceEditDialog({ invoice, open, onOpenChange, onInvoiceUpdated }: InvoiceEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(invoice.client_id);
  const [formData, setFormData] = useState({
    client_id: invoice.client_id,
    project_id: invoice.project_id || '',
    currency: invoice.currency,
    total_ht: invoice.total_ht,
    total_tva: invoice.total_tva,
    total_ttc: invoice.total_ttc,
    status: invoice.status,
    due_date: invoice.due_date || '',
    external_ref: invoice.external_ref || '',
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
      setSelectedClientId(invoice.client_id);
      setFormData({
        client_id: invoice.client_id,
        project_id: invoice.project_id || '',
        currency: invoice.currency,
        total_ht: invoice.total_ht,
        total_tva: invoice.total_tva,
        total_ttc: invoice.total_ttc,
        status: invoice.status,
        due_date: invoice.due_date || '',
        external_ref: invoice.external_ref || '',
      });
    }
  }, [invoice, open]);

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
      const result = await updateInvoice(invoice.id, formData);
      if (result.success) {
        toast.success('Facture mise à jour avec succès');
        onOpenChange(false);
        onInvoiceUpdated?.();
      } else {
        toast.error(result.error || 'Erreur lors de la mise à jour de la facture');
      }
    } catch (error) {
      console.error('Erreur mise à jour facture:', error);
      toast.error('Erreur lors de la mise à jour de la facture');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la facture {invoice.number}</DialogTitle>
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
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as InvoiceStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="issued">Émise</SelectItem>
                <SelectItem value="sent">Envoyée</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
                <SelectItem value="canceled">Annulée</SelectItem>
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
              <Label>Date d&apos;échéance</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
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

          <div className="space-y-2">
            <Label>Référence externe</Label>
            <Input
              placeholder="Ex: Référence CinetPay"
              value={formData.external_ref}
              onChange={(e) => setFormData(prev => ({ ...prev, external_ref: e.target.value }))}
            />
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
