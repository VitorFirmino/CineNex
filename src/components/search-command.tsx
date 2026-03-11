"use client";

import * as React from "react";
import {
  Film,
  Tv,
  Zap,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@components/ui/command";
import type { GroupCount } from "@shared/types/catalog-types";
import { sanitizeDisplayTitle } from "@shared/utils";

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupCount[];
  onSelectGroup: (group: string) => void;
  onSelectTab: (tab: "movies" | "series") => void;
}

export function SearchCommand({
  open,
  onOpenChange,
  groups,
  onSelectGroup,
  onSelectTab,
}: SearchCommandProps) {
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="relative overflow-hidden bg-[#070708]/95 backdrop-blur-2xl border-b border-white/5">
         <div className="absolute inset-0 pointer-events-none opacity-10 sci-fi-grid" />
         <CommandInput 
            placeholder="O que você quer assistir hoje?" 
            className="h-20 border-none bg-transparent text-lg font-black tracking-widest uppercase italic placeholder:text-zinc-700"
         />
      </div>
      <CommandList className="max-h-[60vh] bg-[#070708]/90 backdrop-blur-3xl p-4 no-scrollbar">
        <CommandEmpty className="py-20 text-center flex flex-col items-center gap-4">
           <div className="size-12 rounded-full border border-rose-500/20 bg-rose-500/5 flex items-center justify-center">
              <Zap className="size-6 text-rose-500" />
           </div>
           <p className="text-sm font-black text-zinc-500 uppercase tracking-[0.3em]">Nenhum resultado encontrado</p>
        </CommandEmpty>
        
        <CommandGroup heading={<span className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em] px-4">Atalhos</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-2 py-4">
            <CommandItem
              onSelect={() => { onSelectTab("movies"); onOpenChange(false); }}
              className="h-16 rounded-xl border border-white/5 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all flex items-center px-6 cursor-pointer group"
            >
              <Film className="mr-4 size-5 text-zinc-500 group-hover:text-emerald-400" />
              <span className="font-black text-xs uppercase tracking-widest">Filmes</span>
            </CommandItem>
            <CommandItem
              onSelect={() => { onSelectTab("series"); onOpenChange(false); }}
              className="h-16 rounded-xl border border-white/5 bg-white/5 hover:bg-violet-500/10 hover:border-violet-500/40 transition-all flex items-center px-6 cursor-pointer group"
            >
              <Tv className="mr-4 size-5 text-zinc-500 group-hover:text-violet-400" />
              <span className="font-black text-xs uppercase tracking-widest">Séries</span>
            </CommandItem>
          </div>
        </CommandGroup>
        
        <CommandSeparator className="bg-white/5 my-4" />
        
        <CommandGroup heading={<span className="text-xs font-black text-zinc-500 uppercase tracking-[0.4em] px-4">Categorias</span>}>
          <div className="space-y-1 p-2">
            {groups.slice(0, 15).map((group) => (
              <CommandItem
                key={group.name}
                onSelect={() => {
                  onSelectGroup(group.name);
                  onOpenChange(false);
                }}
                className="h-14 rounded-lg px-6 flex items-center justify-between border border-transparent hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group"
              >
                <div className="flex items-center">
                  <Zap className="mr-4 size-4 text-zinc-700 group-hover:text-emerald-400 group-hover:animate-pulse" />
                  <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">{sanitizeDisplayTitle(group.name)}</span>
                </div>
                <CommandShortcut className="text-xs font-mono text-zinc-600 border border-white/5 px-3 py-1 rounded bg-black/40">
                  {group.count} Itens
                </CommandShortcut>
              </CommandItem>
            ))}
          </div>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
