import { parseParams, ACTIVE_STATUSES } from "@/lib/all-tasks-query";

function p(qs: string) {
  return parseParams(new URLSearchParams(qs));
}

describe("parseParams — defaults", () => {
  it("with no params, status is the five active statuses, no assignedToId, no bucketId, sort=dueDate, dir=asc", () => {
    const result = p("");
    expect(result.where.status.in).toEqual([...ACTIVE_STATUSES]);
    expect("assignedToId" in result.where).toBe(false);
    expect("bucketId" in result.where).toBe(false);
    expect(result.sort).toBe("dueDate");
    expect(result.dir).toBe("asc");
  });
});

describe("parseParams — status filter", () => {
  it("single value passes through", () => {
    expect(p("status=in_progress").where.status.in).toEqual(["in_progress"]);
  });
  it("multiple values pass through", () => {
    expect(p("status=in_progress&status=blocked").where.status.in.sort()).toEqual(["blocked", "in_progress"]);
  });
  it("ignores values not in the active set (done, boulder)", () => {
    expect(p("status=done&status=boulder&status=in_progress").where.status.in).toEqual(["in_progress"]);
  });
  it("ignores garbage values", () => {
    expect(p("status=banana").where.status.in).toEqual([...ACTIVE_STATUSES]);
  });
  it("if all values are invalid, falls back to the full active set", () => {
    expect(p("status=done&status=boulder").where.status.in).toEqual([...ACTIVE_STATUSES]);
  });
});

describe("parseParams — assignedTo", () => {
  it("a user id sets assignedToId to that id", () => {
    expect(p("assignedTo=user_123").where.assignedToId).toBe("user_123");
  });
  it("the literal 'unassigned' sets assignedToId to null", () => {
    const r = p("assignedTo=unassigned");
    expect(r.where.assignedToId).toBeNull();
  });
});

describe("parseParams — bucketId", () => {
  it("a bucket id sets bucketId to that id", () => {
    expect(p("bucketId=bkt_1").where.bucketId).toBe("bkt_1");
  });
  it("the literal 'uncategorized' sets bucketId to null", () => {
    expect(p("bucketId=uncategorized").where.bucketId).toBeNull();
  });
});

describe("parseParams — sort and dir", () => {
  it("valid sort and dir pass through", () => {
    expect(p("sort=priority&dir=desc")).toMatchObject({ sort: "priority", dir: "desc" });
  });
  it("invalid sort falls back to dueDate", () => {
    expect(p("sort=banana").sort).toBe("dueDate");
  });
  it("invalid dir falls back to asc", () => {
    expect(p("dir=banana").dir).toBe("asc");
  });
});

import { sortTasks, type SortableTask } from "@/lib/all-tasks-query";

type T = SortableTask & { id: string };
const t = (id: string, fields: Partial<T> = {}): T => ({
  id,
  title: id,
  priority: "medium",
  dueDate: null,
  assignedTo: null,
  ...fields,
});

describe("sortTasks — title", () => {
  it("asc: alphabetical", () => {
    const ids = sortTasks([t("Beta"), t("alpha"), t("Charlie")], "title", "asc").map(x => x.id);
    expect(ids).toEqual(["alpha", "Beta", "Charlie"]);
  });
  it("desc: reverse alphabetical", () => {
    const ids = sortTasks([t("Beta"), t("alpha"), t("Charlie")], "title", "desc").map(x => x.id);
    expect(ids).toEqual(["Charlie", "Beta", "alpha"]);
  });
});

describe("sortTasks — priority", () => {
  it("asc: high → medium → low", () => {
    const ids = sortTasks([
      t("L", { priority: "low" }),
      t("H", { priority: "high" }),
      t("M", { priority: "medium" }),
    ], "priority", "asc").map(x => x.id);
    expect(ids).toEqual(["H", "M", "L"]);
  });
  it("desc: low → medium → high", () => {
    const ids = sortTasks([
      t("L", { priority: "low" }),
      t("H", { priority: "high" }),
      t("M", { priority: "medium" }),
    ], "priority", "desc").map(x => x.id);
    expect(ids).toEqual(["L", "M", "H"]);
  });
});

describe("sortTasks — dueDate", () => {
  const A = t("A", { dueDate: new Date("2026-05-10") });
  const B = t("B", { dueDate: new Date("2026-05-01") });
  const N1 = t("N1", { dueDate: null });
  const N2 = t("N2", { dueDate: null });

  it("asc: earliest first, nulls last", () => {
    const ids = sortTasks([N1, A, N2, B], "dueDate", "asc").map(x => x.id);
    expect(ids.slice(0, 2)).toEqual(["B", "A"]);
    expect(ids.slice(2).sort()).toEqual(["N1", "N2"]);
  });
  it("desc: latest first, nulls first", () => {
    const ids = sortTasks([A, N1, B, N2], "dueDate", "desc").map(x => x.id);
    expect(ids.slice(0, 2).sort()).toEqual(["N1", "N2"]);
    expect(ids.slice(2)).toEqual(["A", "B"]);
  });
  it("accepts ISO strings as well as Date objects", () => {
    const X = t("X", { dueDate: "2026-04-30" as any });
    const ids = sortTasks([A, X, B], "dueDate", "asc").map(x => x.id);
    expect(ids).toEqual(["X", "B", "A"]);
  });
});

describe("sortTasks — owner", () => {
  const Alice = t("alice", { assignedTo: { name: "Alice" } });
  const Bob = t("bob", { assignedTo: { name: "Bob" } });
  const Una = t("una", { assignedTo: null });
  const Unb = t("unb", { assignedTo: null });

  it("asc: A→Z, nulls grouped at end", () => {
    const ids = sortTasks([Una, Bob, Alice, Unb], "owner", "asc").map(x => x.id);
    expect(ids.slice(0, 2)).toEqual(["alice", "bob"]);
    expect(ids.slice(2).sort()).toEqual(["una", "unb"]);
  });
  it("desc: Z→A, nulls still at end", () => {
    const ids = sortTasks([Una, Bob, Alice, Unb], "owner", "desc").map(x => x.id);
    expect(ids.slice(0, 2)).toEqual(["bob", "alice"]);
    expect(ids.slice(2).sort()).toEqual(["una", "unb"]);
  });
});
