'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Project { id: string; name: string }

export function DocumentCreateDialog() {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from('projects')
      .select('id, name')
      .order('name')
      .then(({ data }) => setProjects((data as Project[]) || []));
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !projectId || !label) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('label', label);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload échoué');
      setOpen(false);
      setFile(null);
      setLabel('');
      setProjectId('');
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nouveau document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Uploader un document</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Projet</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un projet" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Libellé</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Fichier</Label>
            <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" /> {isUploading ? 'Upload...' : 'Uploader'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


