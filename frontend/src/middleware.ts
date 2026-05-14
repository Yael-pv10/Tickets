import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PREFIX = '/dashboard';
const STAFF_PREFIX = '/scan';
const CLIENT_PREFIX = '/my-tickets';

// La autorización real ocurre en el backend por cada petición.
// Aquí solo evitamos navegación inútil: si el usuario no tiene el rol esperado,
// redirigimos a una ruta donde sí puede estar, sin esperar al 403 del API.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAdmin = pathname.startsWith(ADMIN_PREFIX);
  const requiresStaffOrAdmin = pathname.startsWith(STAFF_PREFIX);
  const requiresAuth = requiresAdmin || requiresStaffOrAdmin || pathname.startsWith(CLIENT_PREFIX);

  if (!requiresAuth) return NextResponse.next();

  const marker = request.cookies.get('auth-present');
  if (!marker) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const role = request.cookies.get('auth-role')?.value;

  if (requiresAdmin && role !== 'ADMIN') {
    const url = request.nextUrl.clone();
    // STAFF tiene su propia área. Cualquier otra cosa al home.
    url.pathname = role === 'STAFF' ? '/scan' : '/';
    return NextResponse.redirect(url);
  }

  if (requiresStaffOrAdmin && role !== 'STAFF' && role !== 'ADMIN') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/scan/:path*', '/my-tickets/:path*'],
};
