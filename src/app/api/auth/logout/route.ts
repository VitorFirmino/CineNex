import { NextResponse } from "next/server";
import { createClient } from "@infrastructure/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível encerrar a sessão." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
