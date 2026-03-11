import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@infrastructure/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch((error: unknown) => {
    console.error("[auth/login] Falha ao interpretar corpo da requisicao.", error);
    return null;
  }));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados de login inválidos." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { email, password } = parsed.data;
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
