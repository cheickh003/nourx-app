'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  FolderOpen, 
  Users, 
  UserPlus, 
  CheckSquare, 
  FileText, 
  MessageSquare, 
  Settings,
  LogOut,
  Shield,
  Calendar,
  File
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const navigation = [
  {
    name: 'Tableau de bord',
    href: '/admin',
    icon: Shield
  },
  {
    name: 'Projets',
    href: '/admin/projets',
    icon: FolderOpen
  },
  {
    name: 'Clients',
    href: '/admin/clients',
    icon: Users
  },
  {
    name: 'Prospects',
    href: '/admin/prospects',
    icon: UserPlus
  },
  {
    name: 'Tâches',
    href: '/admin/taches',
    icon: CheckSquare
  },
  {
    name: 'Feuille de route',
    href: '/admin/feuille-de-route',
    icon: Calendar
  },
  {
    name: 'Documents',
    href: '/admin/documents',
    icon: File
  },
  {
    name: 'Réclamations',
    href: '/admin/reclamations',
    icon: MessageSquare
  },
  {
    name: 'Factures & Devis',
    href: '/admin/factures-devis',
    icon: FileText
  },
  {
    name: 'Paramètres',
    href: '/admin/parametres',
    icon: Settings
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/sign-in';
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <Shield className="h-6 w-6 mr-2 text-primary" />
        <h1 className="text-xl font-bold">NOURX Admin</h1>
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
