'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { QuoteItem, InvoiceItem } from '@/types/database';
import {
  addQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
  getQuoteItems,
  addInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  getInvoiceItems,
} from '@/app/actions/invoices';

interface ItemsManagerProps {
  documentId: string;
  documentType: 'quote' | 'invoice';
  onTotalsUpdated?: () => void;
}

interface ItemFormData {
  label: string;
  qty: number;
  unit_price: number;
  vat_rate: number;
}

export function ItemsManager({ documentId, documentType, onTotalsUpdated }: ItemsManagerProps) {
  const [items, setItems] = useState<(QuoteItem | InvoiceItem)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuoteItem | InvoiceItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<ItemFormData>({
    label: '',
    qty: 1,
    unit_price: 0,
    vat_rate: 18.0, // TVA par défaut
  });

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = documentType === 'quote' 
        ? await getQuoteItems(documentId)
        : await getInvoiceItems(documentId);
      
      if (result.success && result.data) {
        setItems(result.data);
      } else {
        toast.error(result.error || 'Erreur lors du chargement des items');
      }
    } catch (error) {
      console.error('Erreur chargement items:', error);
      toast.error('Erreur lors du chargement des items');
    } finally {
      setIsLoading(false);
    }
  }, [documentId, documentType]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label.trim()) {
      toast.error('Veuillez saisir un libellé');
      return;
    }

    setIsSubmitting(true);
    try {
      let result;
      
      if (editingItem) {
        // Modification
        result = documentType === 'quote'
          ? await updateQuoteItem(editingItem.id, formData)
          : await updateInvoiceItem(editingItem.id, formData);
      } else {
        // Création
        result = documentType === 'quote'
          ? await addQuoteItem(documentId, formData)
          : await addInvoiceItem(documentId, formData);
      }

      if (result.success) {
        toast.success(editingItem ? 'Item modifié avec succès' : 'Item ajouté avec succès');
        setIsDialogOpen(false);
        setEditingItem(null);
        setFormData({
          label: '',
          qty: 1,
          unit_price: 0,
          vat_rate: 18.0,
        });
        fetchItems();
        onTotalsUpdated?.();
      } else {
        toast.error(result.error || 'Erreur lors de l\'opération');
      }
    } catch (error) {
      console.error('Erreur soumission item:', error);
      toast.error('Erreur lors de l\'opération');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: QuoteItem | InvoiceItem) => {
    setEditingItem(item);
    setFormData({
      label: item.label,
      qty: item.qty,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: QuoteItem | InvoiceItem) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet item ?')) {
      return;
    }

    try {
      const result = documentType === 'quote'
        ? await deleteQuoteItem(item.id)
        : await deleteInvoiceItem(item.id);

      if (result.success) {
        toast.success('Item supprimé avec succès');
        fetchItems();
        onTotalsUpdated?.();
      } else {
        toast.error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression item:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const calculateLineTotals = (item: QuoteItem | InvoiceItem) => {
    const line_ht = item.qty * item.unit_price;
    const line_tva = line_ht * (item.vat_rate / 100);
    const line_ttc = line_ht + line_tva;
    return { line_ht, line_tva, line_ttc };
  };

  const calculateGlobalTotals = () => {
    let total_ht = 0;
    let total_tva = 0;
    
    items.forEach((item) => {
      const { line_ht, line_tva } = calculateLineTotals(item);
      total_ht += line_ht;
      total_tva += line_tva;
    });
    
    return {
      total_ht: Math.round(total_ht * 100) / 100,
      total_tva: Math.round(total_tva * 100) / 100,
      total_ttc: Math.round((total_ht + total_tva) * 100) / 100,
    };
  };

  const totals = calculateGlobalTotals();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Items du {documentType === 'quote' ? 'devis' : 'facture'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Items du {documentType === 'quote' ? 'devis' : 'facture'}</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                onClick={() => {
                  setEditingItem(null);
                  setFormData({
                    label: '',
                    qty: 1,
                    unit_price: 0,
                    vat_rate: 18.0,
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Modifier l\'item' : 'Ajouter un item'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="label">Libellé *</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="Description du produit/service"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="qty">Quantité *</Label>
                    <Input
                      id="qty"
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit_price">Prix unitaire *</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="vat_rate">TVA (%)</Label>
                    <Input
                      id="vat_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.vat_rate}
                      onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Enregistrement...' : (editingItem ? 'Modifier' : 'Ajouter')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun item ajouté pour l&apos;instant.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">P.U.</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="text-right">Total HT</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const { line_ht, line_ttc } = calculateLineTotals(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.label}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.vat_rate}%</TableCell>
                      <TableCell className="text-right">{line_ht.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{line_ttc.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {/* Totaux */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4" />
                <span className="font-medium">Récapitulatif</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total HT :</span>
                  <span className="font-medium">{totals.total_ht.toFixed(2)} XOF</span>
                </div>
                <div className="flex justify-between">
                  <span>Total TVA :</span>
                  <span className="font-medium">{totals.total_tva.toFixed(2)} XOF</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold">
                  <span>Total TTC :</span>
                  <span>{totals.total_ttc.toFixed(2)} XOF</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
