import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@infrastructure/supabase/server";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const parsed = resetSchema.safeParse(await request.json().catch((error: unknown) => {
    console.error("[auth/reset-password] Falha ao interpretar corpo da requisicao.", error);
    return null;
  }));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados de senha inválidos." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Auth session missing" },
      { status: 401 },
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const { error: signOutError } = await supabase.auth.signOut({
    scope: "global",
  });
  if (signOutError) {
    return NextResponse.json({ error: signOutError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Senha atualizada. Todas as sessões anteriores foram encerradas.",
  });
}
