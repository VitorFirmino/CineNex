import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function isReadOnlyCookieWriteError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return error.message.includes(
    "Cookies can only be modified in a Server Action or Route Handler.",
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            if (isReadOnlyCookieWriteError(error)) {
              return;
            }
            console.error("Error setting cookies:", error);
          }
        },
      },
    }
  );
}
