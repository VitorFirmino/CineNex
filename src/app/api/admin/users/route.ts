import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@infrastructure/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { prisma } from "@infrastructure/database/prisma";

type AdminUserRole = "ADMIN" | "USER";

interface UpdateUserRoleRequestBody {
  id: string;
  role: AdminUserRole;
}

interface DeleteUserRequestBody {
  id: string;
}

const VALID_ADMIN_ROLES = new Set<AdminUserRole>(["ADMIN", "USER"]);

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  return profile?.role === "ADMIN" ? user : null;
}

export async function GET(request: NextRequest) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: "Permissão negada" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "20"), 100);

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { favorites: true } },
      },
    }),
    prisma.profile.count(),
  ]);

  return NextResponse.json({ users: profiles, total, page, pageSize });
}

export async function PATCH(request: NextRequest) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: "Permissão negada" }, { status: 403 });

  const body = await request.json() as UpdateUserRoleRequestBody;
  const { id, role } = body;

  if (!id || !VALID_ADMIN_ROLES.has(role)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  if (id === admin.id) {
    return NextResponse.json({ error: "Não pode alterar o próprio role" }, { status: 400 });
  }

  const updated = await prisma.profile.update({
    where: { id },
    data: { role },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(request: NextRequest) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: "Permissão negada" }, { status: 403 });

  const body = await request.json() as DeleteUserRequestBody;
  const { id } = body;

  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  if (id === admin.id) {
    return NextResponse.json({ error: "Não pode excluir a própria conta" }, { status: 400 });
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(id);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await prisma.profile.deleteMany({ where: { id } });

  return NextResponse.json({ deleted: true });
}
