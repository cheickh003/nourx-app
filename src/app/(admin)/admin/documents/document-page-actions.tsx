'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Trash2 } from 'lucide-react';
import { deleteDocument } from '@/app/actions/documents';
import { useRouter } from 'next/navigation';

import type { Document } from '@/types/database';

interface DocumentPageActionsProps {
  document: Document;
}

export function DocumentPageActions({ document }: DocumentPageActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      if (response.ok) {
        const result = await response.json();
        const url = result?.data?.download_url;
        if (url) window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  const handleView = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      if (response.ok) {
        const result = await response.json();
        const url = result?.data?.download_url;
        if (url) window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Erreur visualisation:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteDocument(document.id);
      if (result.success) {
        router.refresh();
      } else {
        console.error('Erreur:', result.error);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={handleDownload}>
        <Download className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleView}>
        <ExternalLink className="h-3 w-3" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-red-600"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
