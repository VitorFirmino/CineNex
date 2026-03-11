export type ProgressContext = {
  contentType: "movies" | "series";
  contentId: string;
  episodeId?: string | null;
  playHref: string;
};

export type ResumeProgress = {
  episodeId: string | null;
  positionSec: number;
  completed: boolean;
};
