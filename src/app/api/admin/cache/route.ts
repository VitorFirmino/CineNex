import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@infrastructure/supabase/server';
import { prisma } from '@infrastructure/database/prisma';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
