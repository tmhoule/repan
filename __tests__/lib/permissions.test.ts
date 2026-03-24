import { canEditTask, canDeleteTask, canAccessAdmin, canReorderBacklog, canViewFullReports } from "@/lib/permissions";

const manager = { id: "m1", role: "manager" as const };
const staff = { id: "s1", role: "staff" as const };

describe("canEditTask", () => {
  it("manager can edit any", () => { expect(canEditTask(manager, { createdById: "x", assignedToId: "x" })).toBe(true); });
  it("staff assigned", () => { expect(canEditTask(staff, { createdById: "x", assignedToId: "s1" })).toBe(true); });
  it("staff created", () => { expect(canEditTask(staff, { createdById: "s1", assignedToId: "x" })).toBe(true); });
  it("staff neither", () => { expect(canEditTask(staff, { createdById: "x", assignedToId: "x" })).toBe(false); });
});

describe("role-based", () => {
  it("manager delete", () => { expect(canDeleteTask(manager)).toBe(true); });
  it("staff no delete", () => { expect(canDeleteTask(staff)).toBe(false); });
  it("manager admin", () => { expect(canAccessAdmin(manager)).toBe(true); });
  it("staff no admin", () => { expect(canAccessAdmin(staff)).toBe(false); });
  it("manager reorder", () => { expect(canReorderBacklog(manager)).toBe(true); });
  it("staff no reorder", () => { expect(canReorderBacklog(staff)).toBe(false); });
  it("manager reports", () => { expect(canViewFullReports(manager)).toBe(true); });
  it("staff no reports", () => { expect(canViewFullReports(staff)).toBe(false); });
});
