'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSyncExternalStore } from 'react';
import {
  User as UserIcon,
  LogIn,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Home,
  Film,
  Tv,
  Clapperboard,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@components/ui/sheet";
import { usePathname } from 'next/navigation';
import { cn } from '@shared/utils';
import { useSiteHeader } from './hooks/use-site-header';
import type { AuthUser } from '@infrastructure/api/auth-api';

type SiteHeaderUser = NonNullable<ReturnType<typeof useSiteHeader>['user']>;

interface UserAvatarProps {
  user: SiteHeaderUser;
  className: string;
  iconClassName?: string;
}

interface NavLinksProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

function resolveDisplayName(user: SiteHeaderUser) {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Conta'
  );
}

function resolveAvatarUrl(user: SiteHeaderUser) {
  return user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
}

function UserAvatar({
  user,
  className,
  iconClassName,
}: UserAvatarProps) {
  const avatarUrl = resolveAvatarUrl(user);
  const displayName = resolveDisplayName(user);

  if (avatarUrl) {
    return (
      <div className={cn('relative overflow-hidden rounded-full', className)}>
        <Image
          src={avatarUrl}
          alt={`Avatar de ${displayName}`}
          fill
          sizes="40px"
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div className={cn('rounded-full bg-emerald-600/20 flex items-center justify-center border border-emerald-500/30', className)}>
      <UserIcon className={cn('text-emerald-400', iconClassName)} />
    </div>
  );
}

function NavLinks({ onNavigate, isMobile = false }: NavLinksProps) {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Início', icon: Home },
    { href: '/collection/movies', label: 'Filmes', icon: Film },
    { href: '/collection/series', label: 'Séries', icon: Tv },
  ];

  if (isMobile) {
    return (
      <ul className="flex flex-col w-full gap-1.5">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                )}
              >
                <link.icon className={cn('size-4', isActive ? 'text-emerald-400' : 'text-zinc-600')} />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="flex items-center gap-1">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              className={cn(
                'px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all',
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_var(--glow-15)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

interface SiteHeaderProps {
  initialUser?: AuthUser | null;
}

export function SiteHeader({ initialUser = null }: SiteHeaderProps) {
  const hasMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const {
    user,
    loading,
    isImmersiveRoute,
    isAdmin,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    handleLogout,
  } = useSiteHeader({ initialUser });

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500',
        isImmersiveRoute
          ? 'bg-black/30 backdrop-blur-2xl'
          : 'bg-black/50 backdrop-blur-xl border-b border-white/[0.06]'
      )}
    >
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

      <div className="container mx-auto flex h-14 items-center justify-between px-4 xs:px-6">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="size-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center transition-all group-hover:bg-emerald-600/30 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_16px_var(--glow-30)]">
            <Clapperboard className="size-4 text-emerald-400" />
          </div>
          <span className="text-lg font-black tracking-tighter uppercase hidden xs:flex items-baseline">
            <span className="text-white">CINE</span><span className="text-emerald-400">NEX</span>
          </span>
        </Link>

        <nav className="hidden md:block absolute left-1/2 -translate-x-1/2">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/collection/favorites"
                className="hidden xs:flex h-8 px-4 items-center gap-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                <Heart className="size-3 fill-current" />
                <span className="hidden sm:inline">Favoritos</span>
              </Link>

              {hasMounted ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Abrir menu da conta"
                      className="size-8 overflow-hidden rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:border-emerald-500/30"
                    >
                      <UserAvatar user={user} className="size-8" iconClassName="size-4" />
                      <span className="sr-only">Abrir menu da conta</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-zinc-950/95 border-white/10 text-white shadow-2xl backdrop-blur-2xl p-2 mt-2">
                    <div className="flex items-center gap-3 p-4 mb-2 bg-white/5 rounded-xl border border-white/5">
                      <UserAvatar user={user} className="size-9" iconClassName="size-4" />
                      <div className="flex flex-col space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Conta Ativa</p>
                        <p className="text-sm font-black italic truncate max-w-[140px] text-white">
                          {resolveDisplayName(user)}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate max-w-[140px]">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="bg-white/10 mb-2" />

                    <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/5 rounded-lg py-3 px-4">
                      <Link href="/collection/favorites" className="flex items-center w-full font-bold uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white">
                        <Heart className="mr-3 h-4 w-4 text-red-500" /> Favoritos
                      </Link>
                    </DropdownMenuItem>

                    {isAdmin && (
                      <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/5 rounded-lg py-3 px-4">
                        <Link href="/admin" className="flex items-center w-full font-bold uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white">
                          <LayoutDashboard className="mr-3 h-4 w-4 text-emerald-500" /> Admin
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-white/10 my-2" />

                    <DropdownMenuItem
                      className="text-red-400 cursor-pointer focus:bg-red-500/10 focus:text-red-400 rounded-lg py-3 px-4 font-bold uppercase text-[10px] tracking-widest"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-3 h-4 w-4" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Menu da conta carregando"
                  className="size-8 overflow-hidden rounded-full border border-white/10 bg-white/5 text-zinc-400"
                >
                  <UserAvatar user={user} className="size-8" iconClassName="size-4" />
                  <span className="sr-only">Menu da conta carregando</span>
                </Button>
              )}
            </div>
          ) : (
            <Button asChild variant="ghost" className="h-8 px-4 rounded-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 transition-all border border-emerald-500/20 hover:border-emerald-500/40">
              <Link href="/login" className="flex items-center gap-1.5">
                <LogIn className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Entrar</span>
              </Link>
            </Button>
          )}

          {hasMounted ? (
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir menu de navegação"
                  className="md:hidden size-8 rounded-lg border border-white/10 text-zinc-400 bg-white/5 hover:bg-white/10"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[var(--bg-base)]/95 backdrop-blur-2xl border-white/10 text-white w-[280px] p-0">
                <SheetHeader className="p-6 border-b border-white/5 text-left">
                  <SheetTitle className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                      <Clapperboard className="size-4 text-emerald-400" />
                    </div>
                    <span className="text-lg font-black tracking-tighter uppercase">
                      <span className="text-white">CINE</span><span className="text-emerald-400">NEX</span>
                    </span>
                  </SheetTitle>
                  <SheetDescription className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Navegação</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-6 p-6">
                  <nav>
                    <NavLinks isMobile onNavigate={() => setIsMobileMenuOpen(false)} />
                  </nav>

                  <div className="pt-6 border-t border-white/5 space-y-1.5">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1 mb-3">Conta</p>
                    {user ? (
                      <>
                        <Link
                          href="/collection/favorites"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Heart className="size-4 text-red-500" /> Favoritos
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <LayoutDashboard className="size-4 text-emerald-500" /> Admin
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-sm font-black uppercase tracking-widest text-red-400 hover:bg-red-500/5 transition-all"
                        >
                          <LogOut className="size-4" /> Sair
                        </button>
                      </>
                    ) : (
                      <Button asChild className="w-full bg-emerald-600 text-white font-black uppercase tracking-widest text-xs h-11 rounded-xl shadow-[0_0_20px_var(--glow-30)]">
                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Fazer login</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menu de navegação"
              className="md:hidden size-8 rounded-lg border border-white/10 text-zinc-400 bg-white/5"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
