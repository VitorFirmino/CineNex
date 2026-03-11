import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function sanitizeDisplayTitle(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

export function cleanTitleForSearch(value: string): string {
  if (!value) return "";
  return value
    .replace(/_/g, " ")
    .replace(/^\d+\s*-\s*/, "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\((19|20)\d{2}\)/g, " ")
    .replace(/\s(19|20)\d{2}$/, " ")
    .replace(/\sS\d{1,2}E\d{1,4}.*$/i, " ")
    .replace(/\s\d{1,2}[xX]\d{1,4}.*$/i, " ")
    .replace(/\sS\d{1,2}.*$/i, " ")
    .replace(/\bEP\d+\b/i, " ")
    .replace(/\b(4K|8K|UHD|FHD|SDR|HDR10?\+?|HEVC|H\.?265|H\.?264|x265|x264|WEB-?DL|WEBRip|BRRip|BluRay|Blu-?Ray|DVDRip|BDRip|HDCAM|HDTS|DUBLADO|LEGENDADO|DUAL|MULTISUBS?|SUBS?|WEBRIP|HDTV)\b/gi, " ")
    .replace(/[^a-zA-Z0-9áàâãéèêíïóôõöúçÑñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function placeholderImage(type: "poster" | "backdrop"): string {
  const svg =
    type === "poster"
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#040812"/>
              <stop offset="100%" stop-color="#12335a"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
          <text x="50%" y="46%" fill="#99d8fb" font-size="24" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">CATÁLOGO</text>
          <text x="50%" y="54%" fill="#75aacd" font-size="14" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">Sem capa</text>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e1b4b"/>
              <stop offset="100%" stop-color="#312e81"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
          <rect width="100%" height="100%" fill="none" stroke="#38bdf8" stroke-width="4" stroke-dasharray="20,20" />
          <text x="50%" y="47%" fill="#38bdf8" font-size="54" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="bold">CARREGANDO MÍDIA</text>
          <text x="50%" y="56%" fill="#7dd3fc" font-size="20" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">Explorer Cinematic Interface</text>
        </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
