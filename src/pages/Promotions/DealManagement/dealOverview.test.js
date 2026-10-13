import { getDealOverview } from "./dealOverview";

test("uses complete status totals including statuses without tabs and nested sales summary", () => {
  const result = getDealOverview({
    statusCounts: [
      { status: "active", count: "21" },
      { status: "expired", count: "4" },
      { status: "draft", count: "2" },
    ],
    summary: { unitsSold: 8, revenue: 1200 },
  }, 3);
  expect(result.tabCounts).toEqual({
    "": 30, product_keys: 3, pending_approval: 0, active: 21,
    scheduled: 0, expired: 4, rejected: 0, cancelled: 0,
  });
  expect(result.metrics).toEqual({
    total: 27, active: 21, scheduled: 0, expired: 4, units: 8, revenue: 1200,
  });
});

test("supports object counts and resets absent statuses after a refresh", () => {
  expect(getDealOverview({ statusCounts: { active: "1" } }).tabCounts.active).toBe(1);
  expect(getDealOverview({ statusCounts: [] }).tabCounts.active).toBe(0);
  expect(getDealOverview().metrics.total).toBe(0);
});
