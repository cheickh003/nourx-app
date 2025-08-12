'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, FileText, Download, Loader2, Eye } from 'lucide-react';
import Link from 'next/link';
import { QuoteEditDialog } from './quote-edit-dialog';
import { InvoiceEditDialog } from './invoice-edit-dialog';
import { deleteQuote, deleteInvoice } from '@/app/actions/invoices';
import { toast } from 'sonner';
import type { Quote, Invoice } from '@/types/database';

interface QuoteActionsProps {
  quote: Quote;
  onUpdate?: () => void;
}

export function QuoteActions({ quote, onUpdate }: QuoteActionsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le devis ${quote.number} ?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteQuote(quote.id);
      if (result.success) {
        toast.success('Devis supprimé avec succès');
        onUpdate?.();
      } else {
        toast.error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression devis:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGeneratePDF = () => {
    window.open(`/api/quotes/${quote.id}/pdf`, '_blank');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/factures-devis/devis/${quote.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              Voir détails
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGeneratePDF}>
            <FileText className="mr-2 h-4 w-4" />
            Générer PDF
          </DropdownMenuItem>
          {quote.pdf_url && (
            <DropdownMenuItem onClick={() => window.open(quote.pdf_url!, '_blank')}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger PDF
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 focus:text-red-600"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <QuoteEditDialog
        quote={quote}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onQuoteUpdated={onUpdate}
      />
    </>
  );
}

interface InvoiceActionsProps {
  invoice: Invoice;
  onUpdate?: () => void;
}

export function InvoiceActions({ invoice, onUpdate }: InvoiceActionsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la facture ${invoice.number} ?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteInvoice(invoice.id);
      if (result.success) {
        toast.success('Facture supprimée avec succès');
        onUpdate?.();
      } else {
        toast.error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression facture:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGeneratePDF = () => {
    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/factures-devis/factures/${invoice.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              Voir détails
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGeneratePDF}>
            <FileText className="mr-2 h-4 w-4" />
            Générer PDF
          </DropdownMenuItem>
          {invoice.pdf_url && (
            <DropdownMenuItem onClick={() => window.open(invoice.pdf_url!, '_blank')}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger PDF
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 focus:text-red-600"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InvoiceEditDialog
        invoice={invoice}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onInvoiceUpdated={onUpdate}
      />
    </>
  );
}
