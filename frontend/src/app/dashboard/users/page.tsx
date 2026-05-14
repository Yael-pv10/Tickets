'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminUser } from '@/lib/api/admin';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

type TeamRole = 'STAFF' | 'ADMIN';

function tone(role: AdminUser['role']) {
  switch (role) {
    case 'ADMIN': return 'gold' as const;
    case 'STAFF': return 'sage' as const;
    case 'CLIENT': return 'muted' as const;
  }
}

export default function UsersAdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listUsers().then(setUsers).catch(() => setError('No se pudieron cargar los usuarios'));
  }, []);

  function upsertUser(u: AdminUser) {
    setUsers((prev) => {
      if (!prev) return [u];
      const idx = prev.findIndex((p) => p.id === u.id);
      if (idx === -1) return [u, ...prev];
      const copy = prev.slice();
      copy[idx] = u;
      return copy;
    });
  }

  async function changeRole(id: string, role: TeamRole) {
    setError(null);
    try {
      const updated = await adminApi.updateUserRole(id, role);
      upsertUser(updated);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo cambiar el rol');
    }
  }

  const team = users?.filter((u) => u.role === 'STAFF' || u.role === 'ADMIN') ?? [];
  const clients = users?.filter((u) => u.role === 'CLIENT') ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-16 lg:px-10">
      <div className="flex items-center gap-3">
        <span className="h-px w-12 bg-gold/60" />
        <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
          Equipo · 03
        </span>
      </div>
      <h1 className="mt-4 font-display text-5xl font-medium tracking-tight">Usuarios</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cream-dim">
        El equipo (STAFF y ADMIN) se crea desde aquí. Los CLIENT se registran ellos
        mismos en <span className="font-mono text-cream">/register</span> y no se
        promueven; si necesitas un miembro nuevo del equipo, créalo con un email
        distinto.
      </p>

      {error && (
        <div className="mt-6 border border-curtain/40 bg-curtain/5 px-4 py-3 text-sm text-curtain">
          {error}
        </div>
      )}

      {users === null && !error && (
        <p className="mt-12 font-mono text-sm uppercase tracking-wider2 text-cream-mute">
          Cargando…
        </p>
      )}

      {users && (
        <>
          {/* --- Equipo --- */}
          <section className="mt-12">
            <div className="flex items-baseline justify-between border-b border-ink-300/40 pb-3">
              <h2 className="font-display text-2xl font-medium tracking-tight">Equipo</h2>
              <span className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
                {team.length} {team.length === 1 ? 'miembro' : 'miembros'}
              </span>
            </div>

            <NewTeamMemberForm onCreated={upsertUser} />

            {team.length === 0 ? (
              <p className="mt-8 font-display italic text-cream-dim">
                Aún no hay miembros del equipo aparte de ti.
              </p>
            ) : (
              <div className="mt-8 overflow-hidden border border-ink-300/60 bg-ink-100">
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
                    {team.map((u, idx) => {
                      const isSelf = currentUser?.email === u.email;
                      return (
                        <tr key={u.id} className={idx !== team.length - 1 ? 'border-b border-ink-300/40' : ''}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[10px] tracking-wider2 text-gold-dim">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="font-medium text-cream">{u.name}</span>
                              {isSelf && (
                                <span className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
                                  · tú
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-cream-dim">{u.email}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Badge tone={tone(u.role)}>{u.role}</Badge>
                              <select
                                value={u.role}
                                disabled={isSelf}
                                onChange={(e) => changeRole(u.id, e.target.value as TeamRole)}
                                title={isSelf ? 'No puedes cambiar tu propio rol' : undefined}
                                className="border border-ink-300 bg-ink-50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider2 text-cream focus:border-gold focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <option value="STAFF">STAFF</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
                            {new Date(u.createdAt).toLocaleDateString('es')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* --- Clientes --- */}
          <section className="mt-16">
            <div className="flex items-baseline justify-between border-b border-ink-300/40 pb-3">
              <h2 className="font-display text-2xl font-medium tracking-tight">Clientes</h2>
              <span className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
                {clients.length} {clients.length === 1 ? 'registrado' : 'registrados'} · solo lectura
              </span>
            </div>
            {clients.length === 0 ? (
              <p className="mt-8 font-display italic text-cream-dim">
                Aún no hay clientes registrados.
              </p>
            ) : (
              <div className="mt-6 overflow-hidden border border-ink-300/60 bg-ink-100/60">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-ink-300/60">
                      {['Nombre', 'Correo', 'Registrado'].map((h) => (
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
                    {clients.map((u, idx) => (
                      <tr key={u.id} className={idx !== clients.length - 1 ? 'border-b border-ink-300/40' : ''}>
                        <td className="px-5 py-4 text-cream">{u.name}</td>
                        <td className="px-5 py-4 font-mono text-xs text-cream-dim">{u.email}</td>
                        <td className="px-5 py-4 font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
                          {new Date(u.createdAt).toLocaleDateString('es')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function NewTeamMemberForm({ onCreated }: { onCreated: (u: AdminUser) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<TeamRole>('STAFF');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await adminApi.createTeamMember({ email, name, password, role });
      onCreated(created);
      setEmail('');
      setName('');
      setPassword('');
      setRole('STAFF');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo crear el miembro');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 border border-ink-300/60 bg-ink-100 p-6">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Añadir miembro del equipo</span>
        <span className="font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
          STAFF · ADMIN
        </span>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Input
          label="Nombre"
          placeholder="Nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={120}
          required
        />
        <Input
          label="Correo"
          type="email"
          placeholder="staff@auditorio.local"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Contraseña inicial"
          type="password"
          placeholder="mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={100}
          required
        />
        <Select
          label="Rol"
          value={role}
          onChange={(e) => setRole(e.target.value as TeamRole)}
        >
          <option value="STAFF">STAFF — solo valida boletos</option>
          <option value="ADMIN">ADMIN — gestión completa</option>
        </Select>
        <div className="sm:col-span-2 flex items-center justify-between">
          {error ? (
            <span className="text-xs text-curtain">{error}</span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
              El usuario podrá cambiar su contraseña tras iniciar sesión
            </span>
          )}
          <Button type="submit" loading={submitting}>
            Crear miembro
          </Button>
        </div>
      </div>
    </form>
  );
}
