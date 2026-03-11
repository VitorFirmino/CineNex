import { NextResponse } from 'next/server';
import { createClient } from '@infrastructure/supabase/server';
import { prisma } from '@infrastructure/database/prisma';
import { getMaintenanceState, setMaintenanceState } from '@lib/maintenance';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 403 });
  }

  return NextResponse.json({ maintenance: getMaintenanceState() });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 403 });
  }

  try {
    const { enabled } = await req.json();
    setMaintenanceState(!!enabled);
    return NextResponse.json({ maintenance: !!enabled, success: true });
  } catch (error) {
    console.error("[admin/maintenance] Falha ao interpretar payload.", error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
