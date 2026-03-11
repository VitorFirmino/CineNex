'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Trash2, RefreshCw, MoreHorizontal, Crown, UserRound, Search,
  ChevronLeft, ChevronRight, Shield, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel
} from '@components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@components/ui/sheet';
import { FuturisticBackground } from '@components/backgrounds/futuristic-background';
import { SidebarTrigger } from '@components/ui/sidebar';
import {
  listAdminUsers, updateUserRole, deleteUser, type AdminUser
} from '@infrastructure/api/admin-api';
import { isRequestCanceledError } from '@infrastructure/http/axios-client';

type RoleFilter = 'ALL' | 'ADMIN' | 'USER';

function RoleBadge({ role }: { role: string }) {
  return role === 'ADMIN' ? (
    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 font-bold text-[10px] uppercase tracking-widest gap-1">
      <Crown className="size-3" /> Admin
    </Badge>
  ) : (
    <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 font-bold text-[10px] uppercase tracking-widest gap-1">
      <UserRound className="size-3" /> User
    </Badge>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const usersControllerRef = useRef<AbortController | null>(null);

  const PAGE_SIZE = 10;

  const fetchUsers = useCallback(async () => {
    usersControllerRef.current?.abort();
    const controller = new AbortController();
    usersControllerRef.current = controller;
    setLoadingUsers(true);
    try {
      const data = await listAdminUsers(page, PAGE_SIZE, { signal: controller.signal });
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (error) {
      if (isRequestCanceledError(error)) return;
      console.error('[admin/users] Falha ao carregar usuarios.', error);
    } finally {
      if (usersControllerRef.current === controller) {
        usersControllerRef.current = null;
      }
      if (!controller.signal.aborted) {
        setLoadingUsers(false);
      }
    }
  }, [page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => () => usersControllerRef.current?.abort(), []);

  const handleRoleToggle = async (user: AdminUser) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setActionLoading(user.id);
    try {
      await updateUserRole(user.id, newRole);
      setUsers(us => us.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete.id);
    try {
      await deleteUser(confirmDelete.id);
      setUsers(us => us.filter(u => u.id !== confirmDelete.id));
      setTotalUsers(t => t - 1);
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesEmail = u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesEmail && matchesRole;
  });

  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

  return (
    <main className="min-h-screen relative p-4 xs:p-6 sm:p-8 overflow-x-hidden">
      <FuturisticBackground />

      <div className="relative z-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="bg-zinc-900 border border-white/10 text-white" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic">
                Gestão de <span className="text-emerald-500">Usuários</span>
              </h1>
              <p className="text-zinc-500 font-bold tracking-[0.2em] uppercase text-[10px] mt-1">
                Controle de Acessos e Perfis
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchUsers()}
            className="border border-white/5 hover:bg-white/5 text-zinc-400 hover:text-white shrink-0"
          >
            <RefreshCw className="size-4 mr-2" /> Atualizar Tabela
          </Button>
        </header>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-bold uppercase tracking-widest gap-2 py-1.5">
                <Users className="size-3.5" />
                Total: {totalUsers}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-zinc-900/80 border-white/5 text-zinc-400 hover:text-white h-8 text-xs font-bold">
                    Filtro: {roleFilter === 'ALL' ? 'Todos' : roleFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-950 border-white/10">
                  <DropdownMenuLabel className="text-xs text-zinc-500">Filtrar por Permissão</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
                    <DropdownMenuRadioItem value="ALL" className="text-xs">Todos</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ADMIN" className="text-xs">Admins</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="USER" className="text-xs">Users normais</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
              <Input
                placeholder="Buscar por e-mail..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 bg-zinc-900/80 border-white/5 text-white placeholder:text-zinc-600 text-xs h-9"
              />
            </div>
          </div>

          <Card className="bg-zinc-950/60 backdrop-blur-xl border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="text-left px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">E-mail</th>
                    <th className="text-left px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest hidden sm:table-cell">Role</th>
                    <th className="text-left px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest hidden md:table-cell">Favoritos</th>
                    <th className="text-left px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest hidden lg:table-cell">Último Acesso</th>
                    <th className="text-left px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest hidden lg:table-cell">Registrado</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-3 rounded bg-white/5 animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-zinc-600 font-bold uppercase text-[10px] tracking-widest">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-white/5 hover:bg-white/[0.04] transition-colors group cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('[data-radix-dropdown-menu-trigger]')) return;
                        setSelectedUser(u);
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-gradient-to-br from-emerald-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-[9px] font-black text-white uppercase shrink-0">
                            {u.email[0]}
                          </div>
                          <span className="font-mono text-zinc-300 truncate max-w-[160px]">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-zinc-500 font-bold">
                        {u._count.favorites}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell text-zinc-600 font-mono">
                        {new Date(u.lastActive).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell text-zinc-600 font-mono">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                              disabled={!!actionLoading}
                            >
                              {actionLoading === u.id
                                ? <RefreshCw className="size-3.5 animate-spin text-zinc-400" />
                                : <MoreHorizontal className="size-3.5 text-zinc-400" />
                              }
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-xs font-bold">
                            <DropdownMenuItem
                              onClick={() => handleRoleToggle(u)}
                              className="gap-2 text-zinc-300 hover:text-white cursor-pointer"
                            >
                              <Shield className="size-3.5" />
                              {u.role === 'ADMIN' ? 'Remover Admin' : 'Tornar Admin'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => setConfirmDelete(u)}
                              className="gap-2 text-red-400 hover:text-red-300 cursor-pointer focus:text-red-300"
                            >
                              <Trash2 className="size-3.5" />
                              Excluir usuário
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 bg-white/[0.01]">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  Página {page} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 border border-white/5 hover:bg-white/10 text-zinc-400"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 border border-white/5 hover:bg-white/10 text-zinc-400"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="bg-zinc-950 border-red-500/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white font-black uppercase tracking-wide text-sm">
              Excluir Usuário?
            </DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Esta ação é <span className="text-red-400 font-bold">irreversível</span>.
            O usuário <span className="text-white font-mono">{confirmDelete?.email}</span> e
            todos os seus dados serão permanentemente excluídos.
          </p>
          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(null)}
              className="border border-white/10 text-zinc-400 hover:text-white text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={!!actionLoading}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-widest"
            >
              {actionLoading ? <RefreshCw className="size-3.5 animate-spin mr-2" /> : <Trash2 className="size-3.5 mr-2" />}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Side-Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="bg-zinc-950/95 backdrop-blur-3xl border-white/10 text-white w-full sm:max-w-md p-0 overflow-y-auto">
          {selectedUser && (
            <div className="flex flex-col h-full">
              <SheetHeader className="p-6 border-b border-white/5 space-y-4">
                <SheetTitle className="text-white font-black uppercase tracking-widest flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-sm font-black text-white uppercase shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    {selectedUser.email[0]}
                  </div>
                  <div className="text-left">
                    <div className="text-sm truncate max-w-[200px]">{selectedUser.email}</div>
                    <div className="text-[9px] text-zinc-500 tracking-widest mt-1">ID: {selectedUser.id.split('-')[0]}...</div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="p-6 space-y-8 flex-1">
                {/* Status Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Permissão atual</p>
                    <RoleBadge role={selectedUser.role} />
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Conta Criada em</p>
                    <p className="text-xs font-mono text-zinc-300 mt-2">{new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 col-span-2 flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
                    <div>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Último Acesso Registrado</p>
                      <p className="text-xs font-mono text-zinc-300 mt-1">{new Date(selectedUser.lastActive).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  </div>
                </div>

                {/* Simulated Recent Activity */}
                <div>
                  <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4 flex items-center gap-2">
                    <Activity className="size-3" /> Hitórico Recente (Simulado)
                  </h3>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="mt-1 size-1.5 rounded-full bg-zinc-700 group-hover:bg-emerald-500 transition-colors shadow-[0_0_8px_rgba(16,185,129,0)] group-hover:shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        <div>
                          <p className="text-[11px] text-zinc-300 font-medium">Assistiu ao episódio {i} de Ruptura (Severance)</p>
                          <p className="text-[9px] text-zinc-600 font-mono mt-0.5 tracking-wider">Há {i * 2} horas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-4 border-t border-white/5">
                  <h3 className="text-[9px] font-black uppercase text-red-500/70 tracking-widest mb-3">Ações Perigosas</h3>
                  <Button
                    variant="outline"
                    className="w-full text-xs font-bold uppercase tracking-widest border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400 group"
                    onClick={() => {
                      setSelectedUser(null);
                      setConfirmDelete(selectedUser);
                    }}
                  >
                    <Trash2 className="size-3.5 mr-2 group-hover:scale-110 transition-transform" />
                    Encerrar e Excluir Conta
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
