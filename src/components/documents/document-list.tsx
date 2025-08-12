'use client';

import { useState } from 'react';
import { Document } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { 
  File, 
  Download, 
  MoreVertical, 
  Trash2, 
  Edit,
  Calendar,
  User,
  FileText,
  Image,
  Archive
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DocumentListProps {
  documents: Document[];
  onDocumentUpdate?: () => void;
  canEdit?: boolean;
  className?: string;
}

const MIME_TYPE_ICONS = {
  'application/pdf': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'image/jpeg': Image,
  'image/png': Image,
  'image/gif': Image,
  'image/webp': Image,
  'default': File
};

export function DocumentList({ 
  documents, 
  onDocumentUpdate, 
  canEdit = false, 
  className 
}: DocumentListProps) {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [query, setQuery] = useState<string>('');

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Taille inconnue';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return MIME_TYPE_ICONS.default;
    return MIME_TYPE_ICONS[mimeType as keyof typeof MIME_TYPE_ICONS] || MIME_TYPE_ICONS.default;
  };

  const handleDownload = async (document: Document) => {
    if (isDownloading) return;

    setIsDownloading(document.id);
    
    try {
      const res = await fetch(`/api/documents/${document.id}/download`, { method: 'GET' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.data?.download_url) {
        toast.error(json?.error || 'Erreur génération lien de téléchargement');
        return;
      }
      window.open(json.data.download_url, '_blank');
      toast.success('Téléchargement commencé');
      
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDelete = async (document: Document) => {
    if (isDeleting) return;

    const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer "${document.label}" ?`);
    if (!confirmed) return;

    setIsDeleting(document.id);

    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || 'Erreur suppression document');
        return;
      }
      toast.success('Document supprimé avec succès');
      onDocumentUpdate?.();
      
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(null);
    }
  };

  const renameDocument = async (document: Document) => {
    const newLabel = window.prompt('Nouveau nom du document', document.label || '') || '';
    const trimmed = newLabel.trim();
    if (!trimmed || trimmed === document.label) return;
    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || 'Erreur lors du renommage');
        return;
      }
      toast.success('Document renommé');
      onDocumentUpdate?.();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors du renommage');
    }
  };

  const setVisibility = async (document: Document, visibility: 'private' | 'public') => {
    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || 'Erreur mise à jour visibilité');
        return;
      }
      toast.success(`Visibilité: ${visibility === 'private' ? 'Privé' : 'Public'}`);
      onDocumentUpdate?.();
    } catch (e) {
      console.error(e);
      toast.error('Erreur mise à jour visibilité');
    }
  };

  const filtered = documents.filter(d => {
    const matchesVisibility = filter === 'all' || d.visibility === filter;
    const matchesQuery = query.trim().length === 0 || (d.label ?? '').toLowerCase().includes(query.toLowerCase());
    return matchesVisibility && matchesQuery;
  });

  if (filtered.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Archive className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun document
        </h3>
        <p className="text-gray-500">
          Uploadez des fichiers pour commencer
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-end gap-3 pb-2">
        <div className="flex-1">
          <Label htmlFor="doc-query" className="text-xs">Rechercher</Label>
          <Input id="doc-query" placeholder="Nom du document" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9" />
        </div>
        <div className="w-40">
          <Label className="text-xs">Visibilité</Label>
          <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'public' | 'private')}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="public">Publiques</SelectItem>
              <SelectItem value="private">Privées</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.map(document => {
        const FileIcon = getFileIcon(document.mime_type);
        const isProcessing = isDownloading === document.id || isDeleting === document.id;

        return (
          <Card key={document.id} className={cn(
            'transition-all',
            isProcessing && 'opacity-50 pointer-events-none'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Icône du fichier */}
                <div className="flex-shrink-0 p-3 bg-gray-100 rounded-lg">
                  <FileIcon className="h-6 w-6 text-gray-600" />
                </div>

                {/* Informations principales */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {document.label}
                    </h4>
                    
                    {/* Badge de visibilité */}
                    <Badge variant={document.visibility === 'private' ? 'secondary' : 'default'}>
                      {document.visibility === 'private' ? 'Privé' : 'Public'}
                    </Badge>
                  </div>

                  {/* Métadonnées */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Archive className="h-3 w-3" />
                      <span>{formatFileSize(document.size_bytes)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(document.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>

                    {document.created_by && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>Uploadé</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(document)}
                    disabled={isProcessing}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    {isDownloading === document.id ? 'Téléchargement...' : 'Télécharger'}
                  </Button>

                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => renameDocument(document)} disabled={isProcessing}>
                          <Edit className="mr-2 h-4 w-4" />
                          Renommer
                        </DropdownMenuItem>
                        {document.visibility === 'public' ? (
                          <DropdownMenuItem onClick={() => setVisibility(document, 'private')} disabled={isProcessing}>
                            <Badge className="mr-2">Privé</Badge>
                            Rendre privé
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setVisibility(document, 'public')} disabled={isProcessing}>
                            <Badge className="mr-2">Public</Badge>
                            Rendre public
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDownload(document)}
                          disabled={isProcessing}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(document)}
                          disabled={isProcessing}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting === document.id ? 'Suppression...' : 'Supprimer'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
