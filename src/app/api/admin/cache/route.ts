import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSafeAuthUser } from '@infrastructure/supabase/auth';
import { createClient } from '@infrastructure/supabase/server';
import { prisma } from '@infrastructure/database/prisma';

export async function POST() {
  const supabase = await createClient();
  const user = await getSafeAuthUser(supabase, {
    clearInvalidSession: true,
    logContext: 'admin/cache',
  });

  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  revalidatePath('/', 'layout');
  
  return NextResponse.json({ success: true, message: 'Data cache revalidado e limpo com sucesso' });
}
