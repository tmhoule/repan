const VALID_STATUSES = new Set(["not_started", "in_progress", "blocked", "stalled", "done", "boulder"]);
const VALID_PRIORITIES = new Set(["high", "medium", "low"]);
const VALID_EFFORTS = new Set(["small", "medium", "large"]);

export function validateTaskFields(body: Record<string, any>): string | null {
  if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
    return `Invalid status: ${body.status}`;
  }
  if (body.priority !== undefined && !VALID_PRIORITIES.has(body.priority)) {
    return `Invalid priority: ${body.priority}`;
  }
  if (body.effortEstimate !== undefined && !VALID_EFFORTS.has(body.effortEstimate)) {
    return `Invalid effort estimate: ${body.effortEstimate}`;
  }
  if (body.percentComplete !== undefined) {
    const pc = Number(body.percentComplete);
    if (isNaN(pc) || pc < 0 || pc > 100) return "percentComplete must be 0-100";
  }
  if (body.timeAllocation !== undefined) {
    const ta = Number(body.timeAllocation);
    if (isNaN(ta) || ta < 0 || ta > 100) return "timeAllocation must be 0-100";
  }
  return null;
}

export function clampTaskFields(body: Record<string, any>): void {
  if (body.percentComplete !== undefined) body.percentComplete = Math.max(0, Math.min(100, Number(body.percentComplete)));
  if (body.timeAllocation !== undefined) body.timeAllocation = Math.max(0, Math.min(100, Number(body.timeAllocation)));
}
