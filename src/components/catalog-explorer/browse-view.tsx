"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { FavoriteButton } from "@components/favorite-button";
import { Input } from "@components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select";
import { Skeleton } from "@components/ui/skeleton";
import { Check, ChevronLeft, ChevronRight, Command as CommandIcon, LayoutGrid, Play, Search, SlidersHorizontal, Sparkles, TrendingUp, X as XIcon } from "lucide-react";
import type { CatalogType, GroupCount } from "@shared/types/catalog-types";
import { cleanTitleForSearch, cn, formatNumber, sanitizeDisplayTitle } from "@shared/utils";
import { SafeImage } from "@components/safe-image";
import { buildPagination, COLLECTION_ROUTE_BY_TAB, type CatalogItem } from "./hooks/use-catalog-explorer";
import { MAX_GROUP_FILTERS } from "./hooks/use-catalog-filters";
import type { LegendadoFilter, SortOptions, SortValue } from "@store/catalog-store";

const SearchCommand = dynamic(
  () => import("@components/search-command").then((m) => m.SearchCommand),
  { ssr: false },
);

interface BrowseViewProps {
  activeAdvancedCount: number;
  currentData: { page: number; total: number; totalPages: number } | null | undefined;
  groups: ReadonlyArray<GroupCount>;
  isAdvancedOpen: boolean;
  isCommandOpen: boolean;
  isLoadingList: boolean;
  legendado: LegendadoFilter;
  onPageChange: (page: number) => void;
  onQueryChange: (value: string) => void;
  onSelectSingleGroup: (value: string) => void;
  onSortChange: (value: SortValue) => void;
  onTabChange: (value: CatalogType) => void;
  onToggleGroupFilter: (value: string) => void;
  page: number;
  quality: string;
  query: string;
  resetAdvancedFilters: () => void;
  selectedGroups: ReadonlyArray<string>;
  setIsAdvancedOpen: (open: boolean) => void;
  setIsCommandOpen: (open: boolean) => void;
  setLegendado: (value: LegendadoFilter) => void;
  sort: SortValue;
  sortOptions: SortOptions;
  tab: CatalogType;
  visibleItems: CatalogItem[];
}

export function BrowseView({
  activeAdvancedCount,
  currentData,
  groups,
  isAdvancedOpen,
  isCommandOpen,
  isLoadingList,
  legendado,
  onPageChange,
  onQueryChange,
  onSelectSingleGroup,
  onSortChange,
  onTabChange,
  onToggleGroupFilter,
  page,
  quality,
  query,
  resetAdvancedFilters,
  selectedGroups,
  setIsAdvancedOpen,
  setIsCommandOpen,
  setLegendado,
  sort,
  sortOptions,
  tab,
  visibleItems,
}: BrowseViewProps) {
  return (
    <>
      <motion.section
        key="browse-view"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="space-y-12 px-4 xs:px-6 sm:px-12 lg:px-20 pb-20"
      >
        <div className="flex flex-col gap-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-white/5 pb-8">
            <div className="space-y-5">
              <h2 className="text-5xl font-black sm:text-8xl headline-neo tracking-tighter uppercase italic leading-[0.85] flex flex-col">
                <span className="text-zinc-600 text-3xl sm:text-5xl">Explorar</span>
                <span className="bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Toda Coleção</span>
              </h2>
              <div className="flex gap-10 pt-4">
                {(Object.keys(COLLECTION_ROUTE_BY_TAB) as CatalogType[]).map((type) => (
                  <Link
                    key={type}
                    href={COLLECTION_ROUTE_BY_TAB[type]}
                    scroll={false}
                    className={cn(
                      "text-xs font-black tracking-[0.4em] uppercase transition-all pb-4 border-b-2",
                      tab === type
                        ? "text-emerald-400 border-emerald-500"
                        : "text-zinc-600 border-transparent hover:text-zinc-300",
                    )}
                  >
                    {type === "movies" ? "FILMES" : "SÉRIES"}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  className="h-16 w-full border-white/5 bg-white/[0.03] pl-14 pr-14 rounded-2xl text-base font-bold text-white placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-emerald-500/30 transition-all backdrop-blur-xl shadow-xl"
                  placeholder="Pesquisar por título ou palavra-chave..."
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                />
                {query && (
                  <button
                    onClick={() => onQueryChange("")}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors p-1"
                  >
                    <XIcon className="size-5" />
                  </button>
                )}
              </div>

              <div className="flex gap-3 h-16">
                <Button
                  variant="outline"
                  className={cn(
                    "h-full px-8 rounded-2xl border-white/10 bg-white/5 text-zinc-100 font-black text-[11px] tracking-widest uppercase hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all backdrop-blur-xl flex-1 lg:flex-none",
                    activeAdvancedCount > 0 && "text-emerald-400 border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
                  )}
                  onClick={() => setIsAdvancedOpen(true)}
                >
                  <SlidersHorizontal className="mr-3 size-5 text-emerald-500" />
                  FILTRE
                  {activeAdvancedCount > 0 && (
                    <span className="ml-2 size-5 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black">
                      {activeAdvancedCount}
                    </span>
                  )}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="size-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-emerald-500/10 text-emerald-500 backdrop-blur-xl shadow-xl"
                  onClick={() => setIsCommandOpen(true)}
                >
                  <CommandIcon className="size-6" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-zinc-950/40 p-5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-inner">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 mr-4">
                  <TrendingUp className={cn("size-4 text-emerald-500", isLoadingList && "animate-pulse")} />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap">
                    {isLoadingList ? (
                      <span className="text-emerald-500/80 animate-pulse">BUSCANDO NO CATÁLOGO...</span>
                    ) : (
                      <>{formatNumber(currentData?.total || 0)} {tab === "movies" ? "FILMES" : "SÉRIES"} DISPONÍVEIS</>
                    )}
                  </span>
                </div>

                {(selectedGroups.length > 0 || quality !== "all" || legendado !== "all") && (
                  <>
                    <div className="h-4 w-px bg-white/10 mx-2 hidden md:block" />
                    <div className="flex flex-wrap gap-2">
                      {selectedGroups.map((group) => (
                        <Badge key={group} variant="tech" className="bg-violet-500/5 text-violet-400 border-violet-500/10 py-1.5 px-4 rounded-xl normal-case font-bold text-[10px]">
                          {sanitizeDisplayTitle(group)}
                        </Badge>
                      ))}
                      {quality !== "all" && (
                        <Badge variant="tech" className="bg-violet-500/5 text-violet-400 border-violet-500/10 py-1.5 px-4 rounded-xl font-bold text-[10px]">
                          {quality}
                        </Badge>
                      )}
                      {legendado !== "all" && (
                        <Badge variant="tech" className="bg-blue-500/5 text-blue-400 border-blue-500/10 py-1.5 px-4 rounded-xl font-bold text-[10px]">
                          {legendado === "yes" ? "Legendado" : "Dublado"}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>

              {activeAdvancedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg"
                  onClick={resetAdvancedFilters}
                >
                  REMOVER TODOS OS FILTROS
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 sm:gap-8 min-h-screen">
            {isLoadingList
              ? Array.from({ length: 18 }).map((_, index) => (
                  <div key={index} className="space-y-4">
                    <Skeleton className="aspect-[2/3] rounded-[2rem] bg-white/5 border border-white/5" />
                    <div className="space-y-2 px-2">
                      <Skeleton className="h-3 w-16 bg-white/5" />
                      <Skeleton className="h-5 w-full bg-white/5" />
                    </div>
                  </div>
                ))
              : visibleItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (index % 12) * 0.03, duration: 0.4 }}
                  >
                    <Link href={`/view/${tab}/${item.id}`} className="group relative block">
                      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-[1.8rem] sm:rounded-[2.2rem] bg-zinc-950 border border-white/5 shadow-2xl transition-all duration-500 group-hover:scale-[1.04] group-hover:border-emerald-500/40 group-hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
                        <SafeImage
                          src={item.posterUrl || item.logoUrl || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="}
                          fallbackSrc="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 15vw"
                          className="object-cover opacity-85 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100 pointer-events-none">
                          <div className="size-16 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-[0_0_30px_var(--glow-full)]">
                            <Play className="size-8 fill-current translate-x-1" />
                          </div>
                        </div>

                        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-20">
                          <FavoriteButton
                            type={tab === "movies" ? "movie" : "series"}
                            contentId={item.id}
                            className="size-10 bg-black/40 backdrop-blur-xl border-white/10 hover:bg-emerald-500 hover:text-white"
                          />
                          {"quality" in item && item.quality && (
                            <Badge variant="neon" className="text-[8px] sm:text-[9px] px-2 py-0.5 uppercase font-black">
                              {item.quality}
                            </Badge>
                          )}
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-6 space-y-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                          <p className="text-[9px] font-black text-violet-400 uppercase tracking-[0.2em] line-clamp-1 opacity-90">
                            {sanitizeDisplayTitle(item.groupTitle)}
                          </p>
                          <h3 className="line-clamp-2 text-base sm:text-lg font-black text-white leading-tight uppercase italic group-hover:text-emerald-300 transition-colors">
                            {cleanTitleForSearch(item.title)}
                          </h3>
                          {"year" in item && item.year && (
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                              {item.year}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-12 pt-24 border-t border-white/5">
            <div className="flex items-center gap-4">
              <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_10px_var(--glow-full)]" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">
                PÁGINA {currentData?.page} DE {currentData?.totalPages}
              </p>
            </div>

            {currentData && currentData.totalPages > 1 && (
              <div className="flex items-center gap-3 p-1.5 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-xl">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-12 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  <ChevronLeft className="size-6" />
                </Button>

                <div className="flex gap-1.5 px-2">
                  {buildPagination(page, currentData.totalPages).map((paginationPage) => (
                    <button
                      key={paginationPage}
                      onClick={() => onPageChange(paginationPage)}
                      className={cn(
                        "size-10 rounded-xl text-[10px] font-black transition-all",
                        page === paginationPage
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
                          : "text-zinc-500 hover:text-white hover:bg-white/5",
                      )}
                    >
                      {paginationPage}
                    </button>
                  ))}
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="size-12 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500"
                  disabled={page >= currentData.totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  <ChevronRight className="size-6" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-white/10 bg-[#070708]/98 backdrop-blur-[40px] text-zinc-100 sm:max-w-3xl max-h-[90vh] flex flex-col p-0 shadow-[0_0_100px_rgba(0,0,0,1)]"
        >
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_10%,var(--glow-40),transparent_50%)]" />
          </div>

          <DialogHeader className="p-8 sm:p-12 border-b border-white/5 relative z-10 flex flex-row items-center justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic flex items-center gap-5 text-white">
                <SlidersHorizontal className="size-8 sm:size-10 text-emerald-500" />
                FILTRE O CATÁLOGO
              </DialogTitle>
              <DialogDescription className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">
                Ajuste as configurações para encontrar o conteúdo perfeito.
              </DialogDescription>
            </div>

            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="size-12 rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-all">
                <XIcon className="size-6" />
                <span className="sr-only">Fechar</span>
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-12 no-scrollbar relative z-10">
            <div className="grid gap-10 sm:grid-cols-2">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                  ORDEM DE EXIBIÇÃO
                </p>
                <Select value={sort} onValueChange={(value) => onSortChange(value as SortValue)}>
                  <SelectTrigger className="h-16 rounded-2xl border-white/5 bg-white/[0.03] font-black text-xs tracking-widest uppercase focus:ring-emerald-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1115] border-white/10">
                    {sortOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="h-14 font-black text-[10px] tracking-widest uppercase focus:bg-emerald-600 focus:text-white"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                  TIPO DE ÁUDIO
                </p>
                <Select value={legendado} onValueChange={(value) => setLegendado(value as LegendadoFilter)}>
                  <SelectTrigger className="h-16 rounded-2xl border-white/5 bg-white/[0.03] font-black text-xs tracking-widest uppercase focus:ring-emerald-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1115] border-white/10">
                    <SelectItem value="all" className="h-14 font-black text-[10px] tracking-widest uppercase focus:bg-emerald-600">
                      TODOS OS TÍTULOS
                    </SelectItem>
                    <SelectItem value="no" className="h-14 font-black text-[10px] tracking-widest uppercase focus:bg-emerald-600">
                      DUBLADO (PT-BR)
                    </SelectItem>
                    <SelectItem value="yes" className="h-14 font-black text-[10px] tracking-widest uppercase focus:bg-emerald-600">
                      LEGENDADO / ORIGINAL
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                  CATEGORIAS DISPONÍVEIS
                </p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {selectedGroups.length} DE {MAX_GROUP_FILTERS} SELECIONADOS
                </p>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  className={cn(
                    "h-14 rounded-2xl text-[10px] font-black tracking-widest uppercase border transition-all flex items-center justify-center gap-3",
                    selectedGroups.length === 0
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-lg"
                      : "border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/20 hover:text-zinc-300",
                  )}
                  onClick={() => onToggleGroupFilter("all")}
                >
                  {selectedGroups.length === 0 && <Check className="size-4" />}
                  TODAS AS CATEGORIAS
                </button>
                {groups.slice(0, 24).map((group) => {
                  const isSelected = selectedGroups.includes(group.name);
                  return (
                    <button
                      key={group.name}
                      className={cn(
                        "h-14 px-5 rounded-2xl text-[10px] font-black tracking-widest uppercase border transition-all truncate text-left flex items-center justify-between group/cat",
                        isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg"
                          : "border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/20 hover:text-zinc-300",
                        !isSelected && selectedGroups.length >= MAX_GROUP_FILTERS && "opacity-30 cursor-not-allowed",
                      )}
                      disabled={!isSelected && selectedGroups.length >= MAX_GROUP_FILTERS}
                      onClick={() => onToggleGroupFilter(group.name)}
                    >
                      <span className="truncate">{sanitizeDisplayTitle(group.name)}</span>
                      {isSelected ? (
                        <Check className="size-4 shrink-0" />
                      ) : (
                        <span className="text-zinc-800 group-hover/cat:text-zinc-600 text-[8px] font-bold">ADD</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-12 bg-black/60 border-t border-white/5 flex gap-4 relative z-10">
            <Button
              variant="ghost"
              className="flex-1 h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/5"
              onClick={resetAdvancedFilters}
            >
              RESETAR TUDO
            </Button>
            <Button
              className="flex-[2] h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-900 text-white font-black uppercase tracking-[0.2em] text-[10px] hover:from-emerald-500 hover:to-cyan-500 shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all"
              onClick={() => setIsAdvancedOpen(false)}
            >
              CONFIRMAR E FILTRAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SearchCommand
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        groups={groups as GroupCount[]}
        onSelectGroup={onSelectSingleGroup}
        onSelectTab={onTabChange}
      />
    </>
  );
}
