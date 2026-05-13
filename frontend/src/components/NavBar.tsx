'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className={`relative inline-flex h-full items-center px-1 text-sm font-medium transition-colors ${
        isActive(href) ? 'text-gold' : 'text-cream-dim hover:text-cream'
      }`}
    >
      {children}
      {isActive(href) && (
        <span className="absolute -bottom-px left-0 h-px w-full bg-gold" />
      )}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-ink-300/40 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-gold/60 transition-all group-hover:border-gold group-hover:shadow-gold-glow">
            <span className="font-display text-xl leading-none text-gold">T</span>
          </div>
          <div className="hidden flex-col leading-none sm:flex">
            <span className="font-mono text-[10px] uppercase tracking-marquee text-gold-dim">
              Auditorio
            </span>
            <span className="font-display text-base font-semibold tracking-tight text-cream">
              Teatro Tickets
            </span>
          </div>
        </Link>

        {/* Links */}
        <div className="flex h-full items-center gap-7">
          <NavLink href="/events">Cartelera</NavLink>
          {isAuthenticated && <NavLink href="/my-tickets">Mis boletos</NavLink>}
          {isStaff && <NavLink href="/scan">Validar</NavLink>}
          {isAdmin && <NavLink href="/dashboard">Admin</NavLink>}
        </div>

        {/* Auth action */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="hidden flex-col items-end leading-none sm:flex">
                <span className="font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
                  {user?.role}
                </span>
                <span className="text-sm text-cream">{user?.name?.split(' ')[0]}</span>
              </div>
              <button
                onClick={logout}
                className="font-mono text-[11px] uppercase tracking-wider2 text-cream-mute hover:text-curtain transition-colors"
              >
                Salir →
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center border border-gold/40 px-4 font-mono text-[11px] uppercase tracking-wider2 text-gold transition-colors hover:bg-gold hover:text-ink"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
