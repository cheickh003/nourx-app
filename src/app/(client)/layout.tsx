"use client";
import React from 'react'
import { ClientSidebar } from '@/components/layout/client-sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname?.() || ''
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = [
    { label: 'Accueil', href: '/dashboard' },
    ...segments.map((seg, idx) => {
      const href = '/' + segments.slice(0, idx + 1).join('/')
      return { label: seg.replace(/-/g, ' '), href }
    })
  ]
  return (
    <div className="flex min-h-dvh bg-background">
      <ClientSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b px-4 sm:px-6">
          <div className="lg:hidden mr-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Ouvrir la navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <ClientSidebar variant="mobile" />
              </SheetContent>
            </Sheet>
          </div>
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((c, i) => (
                <React.Fragment key={`crumb-${i}`}>
                  <BreadcrumbItem>
                    {i === crumbs.length - 1 ? (
                      <BreadcrumbPage>{c.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={c.href}>{c.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {i < crumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
