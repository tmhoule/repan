export const ICON_EMOJI_MAP: Record<string, string> = {
  sword: "⚔️",
  broom: "🧹",
  key: "🔑",
  fire: "🔥",
  clock: "⏰",
  shield: "🛡️",
  "speech-bubble": "💬",
  weight: "🏋️",
  sunrise: "🌅",
  handshake: "🤝",
  crown: "👑",
  star: "⭐",
  "magnifying-glass": "🔍",
  lightning: "⚡",
  medal: "🏅",
  trophy: "🏆",
  rocket: "🚀",
  gem: "💎",
  heart: "❤️",
  target: "🎯",
};

export function resolveIcon(icon: string): string {
  const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
  if (isEmoji) return icon;
  return ICON_EMOJI_MAP[icon] || "🏅";
}
