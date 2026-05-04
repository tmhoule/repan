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
