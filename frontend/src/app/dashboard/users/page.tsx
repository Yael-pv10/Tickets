'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminUser } from '@/lib/api/admin';
import { Badge } from '@/components/ui/Badge';

const ROLES: AdminUser['role'][] = ['CLIENT', 'STAFF', 'ADMIN'];

function tone(role: AdminUser['role']) {
  switch (role) {
    case 'ADMIN': return 'gold' as const;
    case 'STAFF': return 'sage' as const;
    case 'CLIENT': return 'muted' as const;
  }
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listUsers().then(setUsers).catch(() => setError('No se pudieron cargar los usuarios'));
  }, []);

  async function changeRole(id: string, role: AdminUser['role']) {
    try {
      const updated = await adminApi.updateUserRole(id, role);
      setUsers((prev) => prev?.map((u) => (u.id === id ? updated : u)) ?? null);
    } catch {
      setError('No se pudo cambiar el rol');
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-16 lg:px-10">
      <div className="flex items-center gap-3">
        <span className="h-px w-12 bg-gold/60" />
        <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
          Equipo · 03
        </span>
      </div>
      <h1 className="mt-4 font-display text-5xl font-medium tracking-tight">Usuarios</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-cream-dim">
        Asigna el rol STAFF para que un usuario pueda validar boletos en la entrada.
        Asigna ADMIN para dar acceso completo al panel.
      </p>

      {error && <p className="mt-6 text-curtain">{error}</p>}
      {users === null && !error && (
        <p className="mt-12 font-mono text-sm uppercase tracking-wider2 text-cream-mute">
          Cargando…
        </p>
      )}

      {users && (
        <div className="mt-10 overflow-hidden border border-ink-300/60 bg-ink-100">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-ink-300/60">
                {['Nombre', 'Correo', 'Rol', 'Creado'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-wider2 text-cream-mute"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} className={idx !== users.length - 1 ? 'border-b border-ink-300/40' : ''}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] tracking-wider2 text-gold-dim">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-medium text-cream">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-cream-dim">{u.email}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Badge tone={tone(u.role)}>{u.role}</Badge>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value as AdminUser['role'])}
                        className="border border-ink-300 bg-ink-50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider2 text-cream focus:border-gold focus:outline-none"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
                    {new Date(u.createdAt).toLocaleDateString('es')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
