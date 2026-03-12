import { NextResponse } from 'next/server';
import { getSafeAuthUser } from '@infrastructure/supabase/auth';
import { createClient } from '@infrastructure/supabase/server';
import { prisma } from '@infrastructure/database/prisma';
import { getMaintenanceState, setMaintenanceState } from '@lib/maintenance';

export async function GET() {
  const supabase = await createClient();
  const user = await getSafeAuthUser(supabase, {
    clearInvalidSession: true,
    logContext: 'admin/maintenance',
  });

  if (!user) return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 403 });
  }

  try {
    const maintenance = await getMaintenanceState();
    return NextResponse.json({ maintenance });
  } catch (error) {
    console.error('[admin/maintenance] Falha ao carregar estado de manutenção.', error);
    return NextResponse.json({ error: 'Falha ao carregar estado da manutenção' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await getSafeAuthUser(supabase, {
    clearInvalidSession: true,
    logContext: 'admin/maintenance',
  });

  if (!user) return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 403 });
  }

  let enabled: unknown;
  try {
    ({ enabled } = await req.json());
  } catch (error) {
    console.error('[admin/maintenance] Falha ao interpretar payload.', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const maintenance = await setMaintenanceState(!!enabled);
    return NextResponse.json({ maintenance, success: true });
  } catch (error) {
    console.error('[admin/maintenance] Falha ao persistir modo de manutenção.', error);
    return NextResponse.json({ error: 'Falha ao persistir modo de manutenção' }, { status: 500 });
  }
}
