const MILESTONES = new Set([3, 5, 10, 30]);

function startOfDay(date: Date): Date { const d = new Date(date); d.setHours(0,0,0,0); return d; }

function getWeekNumber(date: Date): number {
  const d = new Date(date); d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  return Math.round(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() - 1) / 7);
}

function daysBetween(a: Date, b: Date): number { return Math.floor((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000); }

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday = start of ISO week
  d.setDate(d.getDate() + diff);
  return d;
}

function weeksBetween(a: Date, b: Date): number {
  const msPerWeek = 7 * 86400000;
  return Math.round((startOfIsoWeek(b).getTime() - startOfIsoWeek(a).getTime()) / msPerWeek);
}

export function shouldIncrementStreak(type: string, last: Date, now: Date): boolean {
  if (type === "daily_checkin") return daysBetween(last, now) === 1;
  if (type === "weekly_momentum") return weeksBetween(last, now) === 1;
  return false;
}

export function shouldResetStreak(type: string, last: Date, now: Date): boolean {
  if (type === "daily_checkin") return daysBetween(last, now) > 1;
  if (type === "weekly_momentum") return weeksBetween(last, now) > 1;
  return false;
}

export function isStreakMilestone(count: number): boolean { return MILESTONES.has(count); }
