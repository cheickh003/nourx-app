'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Upload, File, X } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
  className?: string;
}

interface FileWithPreview {
  file: File;
  label: string;
  id: string;
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUpload({ projectId, onUploadComplete, className }: DocumentUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Type de fichier non autorisé';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Fichier trop volumineux (max 50MB)';
    }
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles: FileWithPreview[] = [];
    
    for (const file of newFiles) {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }

      // Vérifier si le fichier n'est pas déjà ajouté
      const exists = files.some(f => f.file.name === file.name && f.file.size === file.size);
      if (exists) {
        toast.error(`${file.name} est déjà ajouté`);
        continue;
      }

      validFiles.push({
        file,
        label: file.name.replace(/\.[^/.]+$/, ''), // Nom sans extension
        id: Math.random().toString(36).substr(2, 9)
      });
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileLabel = (id: string, label: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, label } : f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
      e.target.value = ''; // Reset input
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const results = { success: 0, errors: 0 };

    try {
      for (const fileData of files) {
        try {
          const formData = new FormData();
          formData.append('file', fileData.file);
          formData.append('projectId', projectId);
          formData.append('label', fileData.label || fileData.file.name);

          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur upload');
          }

          results.success++;
        } catch (error) {
          console.error(`Erreur upload ${fileData.file.name}:`, error);
          results.errors++;
          toast.error(`Erreur upload ${fileData.file.name}`);
        }
      }

      // Messages de résultat
      if (results.success > 0) {
        toast.success(`${results.success} fichier(s) uploadé(s) avec succès`);
        setFiles([]); // Vider la liste après succès
        if (onUploadComplete) {
          onUploadComplete();
        }
      }

      if (results.errors > 0) {
        toast.error(`${results.errors} erreur(s) d'upload`);
      }

    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Zone de drop */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-8 text-center">
          <Upload className={cn(
            'mx-auto h-12 w-12 mb-4',
            isDragOver ? 'text-blue-500' : 'text-gray-400'
          )} />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragOver ? 'Déposez vos fichiers ici' : 'Glissez vos fichiers ici'}
            </p>
            <p className="text-sm text-gray-500">
              ou <span className="text-blue-600 underline">parcourez</span> pour sélectionner
            </p>
            <p className="text-xs text-gray-400">
              PDF, DOC, XLS, PPT, images (max 50MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Fichiers à uploader ({files.length})</h4>
          
          {files.map(fileData => (
            <Card key={fileData.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 bg-gray-100 rounded">
                  <File className="h-4 w-4 text-gray-600" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{fileData.file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileData.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {formatFileSize(fileData.file.size)}
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor={`label-${fileData.id}`} className="text-xs">
                      Libellé du document
                    </Label>
                    <Input
                      id={`label-${fileData.id}`}
                      value={fileData.label}
                      onChange={(e) => updateFileLabel(fileData.id, e.target.value)}
                      placeholder="Nom du document"
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Boutons d'action */}
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              onClick={() => setFiles([])}
              disabled={isUploading}
            >
              Tout effacer
            </Button>
            
            <Button
              onClick={uploadFiles}
              disabled={isUploading || files.length === 0}
              className="min-w-[120px]"
            >
              {isUploading ? 'Upload...' : `Uploader ${files.length} fichier(s)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
