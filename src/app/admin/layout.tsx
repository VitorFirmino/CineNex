import { redirect } from 'next/navigation';
import { getSafeAuthUser } from '@infrastructure/supabase/auth';
import { createClient } from '@infrastructure/supabase/server';
import { prisma } from '@infrastructure/database/prisma';
import { SidebarProvider, SidebarInset } from '@components/ui/sidebar';
import { AdminSidebar } from '@components/admin/admin-sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getSafeAuthUser(supabase, {
    logContext: 'admin/layout',
  });

  if (!user) {
    redirect('/login?next=/admin');
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="dark pt-14 h-screen w-full flex overflow-hidden">
      <SidebarProvider className="bg-zinc-950 text-white flex-1 min-h-0">
        <AdminSidebar />
        <SidebarInset className="bg-zinc-950/50 flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
