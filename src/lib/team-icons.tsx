import {
  Rocket,
  Shield,
  Zap,
  Flame,
  Star,
  Gem,
  Crown,
  Target,
  Compass,
  Anchor,
  Mountain,
  Hexagon,
  Heart,
  Leaf,
  Sun,
  Snowflake,
  type LucideProps,
} from "lucide-react";
import { type ComponentType } from "react";

const TEAM_ICONS: ComponentType<LucideProps>[] = [
  Rocket,
  Shield,
  Zap,
  Flame,
  Star,
  Gem,
  Crown,
  Target,
  Compass,
  Anchor,
  Mountain,
  Hexagon,
  Heart,
  Leaf,
  Sun,
  Snowflake,
];

/** Deterministic hash of a string to pick a consistent icon index. */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Get the Lucide icon component for a team, based on its name. */
export function getTeamIcon(teamName: string): ComponentType<LucideProps> {
  const idx = hashString(teamName) % TEAM_ICONS.length;
  return TEAM_ICONS[idx];
}

/** Render a team icon inline. */
export function TeamIcon({
  teamName,
  ...props
}: { teamName: string } & LucideProps) {
  const Icon = getTeamIcon(teamName);
  return <Icon {...props} />;
}
