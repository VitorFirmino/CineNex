"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, Users, LogOut, Home, MonitorPlay,
  Server, LayoutDashboard
} from "lucide-react";
import { motion } from "framer-motion";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@components/ui/sidebar";
import { cn } from "@shared/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@components/ui/tooltip";

const navMain = [
  {
    title: "Visão Geral",
    url: "/admin",
    icon: BarChart3,
    exact: true,
  },
  {
    title: "Usuários",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Conteúdo",
    url: "/admin/content",
    icon: MonitorPlay,
  },
  {
    title: "Sistema",
    url: "/admin/system",
    icon: Server,
  },
];

const navSecondary = [
  { title: "Ir para Home", url: "/", icon: Home },
  { title: "Catálogo", url: "/discover", icon: LayoutDashboard },
];

function NavItem({
  item,
  isActive,
}: {
  item: (typeof navMain)[0];
  isActive: boolean;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenuItem>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className={cn(
              "relative h-9 gap-2.5 rounded-lg px-3 text-sm font-semibold transition-all duration-200",
              "text-zinc-400 hover:text-white hover:bg-white/5",
              isActive && [
                "bg-gradient-to-r from-emerald-500/15 to-transparent",
                "text-emerald-400 hover:text-emerald-300 hover:from-emerald-500/20",
                "before:absolute before:left-0 before:top-1.5 before:bottom-1.5",
                "before:w-0.5 before:rounded-r-full before:bg-emerald-500",
                "before:shadow-[0_0_8px_2px_rgba(16,185,129,0.4)]",
              ]
            )}
          >
            <Link href={item.url}>
              <item.icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive ? "text-emerald-400" : "text-zinc-500"
                )}
              />
              <span className="truncate">{item.title}</span>
              {isActive && !isCollapsed && (
                <motion.div
                  layoutId="sidebar-active"
                  className="ml-auto size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.6)]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </Link>
          </SidebarMenuButton>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent side="right" className="bg-zinc-900 border-white/10 text-xs font-semibold">
            {item.title}
          </TooltipContent>
        )}
      </Tooltip>
    </SidebarMenuItem>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (item: (typeof navMain)[0]) => {
    if (item.exact) return pathname === item.url;
    return pathname.startsWith(item.url);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/5 top-14 !h-[calc(100svh-56px)] z-40 bg-zinc-950/50 backdrop-blur-2xl [&>[data-sidebar=sidebar]]:bg-transparent"
    >
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <SidebarHeader className="border-b border-white/[0.06] px-3 py-4">
        <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden group">
          <div className="shrink-0 flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[0_0_16px_rgba(16,185,129,0.35)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow">
            <BarChart3 className="size-4 text-white" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-black text-white tracking-tight leading-none">
              Admin<span className="text-emerald-400">Panel</span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mt-0.5">
              Console
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* ─── Main Nav ───────────────────────────────────────────────────── */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navMain.map((item) => (
                <NavItem key={item.url} item={item} isActive={isActive(item)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-3 mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
            Atalhos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navSecondary.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    className="h-9 gap-2.5 rounded-lg px-3 text-sm font-semibold text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <SidebarFooter className="border-t border-white/[0.06] p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-9 gap-2.5 rounded-lg px-3 text-sm font-semibold text-red-400/70 hover:text-red-400 hover:bg-red-500/8 transition-all"
              onClick={() => (window.location.href = "/")}
            >
              <LogOut className="size-4 shrink-0" />
              <span className="truncate">Sair do Painel</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
