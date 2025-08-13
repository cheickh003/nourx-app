"use client";
import React from 'react'
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname?.() || ''
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = [
    { label: 'Accueil', href: '/admin' },
    ...segments.map((seg, idx) => {
      const href = '/' + segments.slice(0, idx + 1).join('/')
      return { label: seg.replace(/-/g, ' '), href }
    })
  ]
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b px-6">
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((c, i) => (
                <React.Fragment key={`admin-crumb-${i}`}>
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
        
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
