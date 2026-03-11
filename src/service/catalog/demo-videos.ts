const DEMO_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
];

const KNOWN_UNAVAILABLE_DEMO_VIDEOS = new Set<string>([
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantDream.mp4",
]);

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getDemoVideoUrl(id: string): string {
  const index = hashId(id) % DEMO_VIDEOS.length;

  for (let offset = 0; offset < DEMO_VIDEOS.length; offset++) {
    const candidate = DEMO_VIDEOS[(index + offset) % DEMO_VIDEOS.length];
    if (!KNOWN_UNAVAILABLE_DEMO_VIDEOS.has(candidate)) {
      return candidate;
    }
  }

  return DEMO_VIDEOS[0];
}
