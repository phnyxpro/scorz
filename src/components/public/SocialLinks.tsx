import { ExternalLink } from "lucide-react";

const platformIcons: Record<string, string> = {
  facebook: "f",
  instagram: "📷",
  x: "𝕏",
  youtube: "▶",
  tiktok: "♪",
};

export function SocialLinks({ links }: { links: Record<string, string> }) {
  const entries = Object.entries(links).filter(([, url]) => url);
  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {entries.map(([platform, url]) => (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors text-xs font-bold"
          title={platform}
        >
          {platformIcons[platform] || platform[0].toUpperCase()}
        </a>
      ))}
    </div>
  );
}
