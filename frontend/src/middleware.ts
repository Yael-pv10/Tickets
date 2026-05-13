import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PREFIX = '/dashboard';
const STAFF_PREFIX = '/scan';
const CLIENT_PREFIX = '/my-tickets';

// La validación de rol real se hace en el backend en cada petición.
// El middleware solo previene navegación a rutas protegidas sin haber pasado por login.
// El refresh token vive en cookie HttpOnly bajo /api/auth y no es accesible aquí;
// usamos un marcador "auth-present" que el cliente coloca tras login exitoso.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith(ADMIN_PREFIX) ||
    pathname.startsWith(STAFF_PREFIX) ||
    pathname.startsWith(CLIENT_PREFIX);

  if (!isProtected) return NextResponse.next();

  const marker = request.cookies.get('auth-present');
  if (!marker) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/scan/:path*', '/my-tickets/:path*'],
};
