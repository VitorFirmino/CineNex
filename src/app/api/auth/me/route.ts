import { NextResponse } from "next/server";
import { createClient } from "@infrastructure/supabase/server";
import { prisma } from "@infrastructure/database/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { user: null },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email || null,
        app_metadata: {
          role: profile?.role ?? null,
        },
        user_metadata: {
          avatar_url: user.user_metadata?.avatar_url || null,
          picture: user.user_metadata?.picture || null,
          full_name: user.user_metadata?.full_name || null,
          name: user.user_metadata?.name || null,
        },
        email_confirmed_at: user.email_confirmed_at || null,
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
