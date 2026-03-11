import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isRegisterPage = request.nextUrl.pathname.startsWith('/register');
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin');
  const isFavoritesPage = request.nextUrl.pathname.startsWith('/collection/favorites');

  if ((isLoginPage || isRegisterPage) && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if ((isAdminPage || isFavoritesPage) && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }


  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
