export type BucketColorKey =
  | "blue"
  | "purple"
  | "amber"
  | "teal"
  | "red"
  | "green"
  | "orange"
  | "pink"
  | "cyan";

interface BucketColorConfig {
  label: string;
  className: string;
  dotColor: string;
}

export const BUCKET_COLORS: Record<BucketColorKey, BucketColorConfig> = {
  blue: {
    label: "Blue",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    dotColor: "bg-blue-500",
  },
  purple: {
    label: "Purple",
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
    dotColor: "bg-purple-500",
  },
  amber: {
    label: "Amber",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    dotColor: "bg-amber-500",
  },
  teal: {
    label: "Teal",
    className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800",
    dotColor: "bg-teal-500",
  },
  red: {
    label: "Red",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    dotColor: "bg-red-500",
  },
  green: {
    label: "Green",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    dotColor: "bg-green-500",
  },
  orange: {
    label: "Orange",
    className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
    dotColor: "bg-orange-500",
  },
  pink: {
    label: "Pink",
    className: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-400 dark:border-pink-800",
    dotColor: "bg-pink-500",
  },
  cyan: {
    label: "Cyan",
    className: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800",
    dotColor: "bg-cyan-500",
  },
};

export const VALID_COLOR_KEYS = Object.keys(BUCKET_COLORS) as BucketColorKey[];

export function isValidColorKey(key: string): key is BucketColorKey {
  return key in BUCKET_COLORS;
}
