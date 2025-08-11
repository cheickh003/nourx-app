'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Map, 
  CheckSquare, 
  FileText, 
  Files, 
  MessageSquare, 
  Settings,
  LogOut
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const navigation = [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    name: 'Aperçu Projet',
    href: '/projet',
    icon: FolderOpen
  },
  {
    name: 'Feuille de Route',
    href: '/feuille-de-route',
    icon: Map
  },
  {
    name: 'Tâches',
    href: '/taches',
    icon: CheckSquare
  },
  {
    name: 'Factures & Devis',
    href: '/factures-devis',
    icon: FileText
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: Files
  },
  {
    name: 'Réclamations',
    href: '/reclamations',
    icon: MessageSquare
  },
  {
    name: 'Paramètres',
    href: '/parametres',
    icon: Settings
  },
];

export function ClientSidebar() {
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/sign-in';
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <h1 className="text-xl font-bold">NOURX Client</h1>
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="border-t p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
