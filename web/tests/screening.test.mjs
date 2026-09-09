import test from "node:test";
import assert from "node:assert/strict";
import { screenIssue } from "../lib/screening.ts";
const now = Date.parse("2026-09-09");
const issue = {
  title: "Improve keyboard shortcut tooltip",
  body: "Expected behavior: clear feedback.",
  labels: [],
  updated_at: "2026-09-08",
  state: "open",
  assignees: [],
};
test("fun and polish finds UX work without a special GitHub label", () =>
  assert.equal(
    screenIssue(issue, { kinds: ["polish"], pace: "quick" }, now).eligible,
    true,
  ));
test("assigned, stale, closed, and pull-request entries never become candidates", () => {
  for (const changes of [
    { assignees: [{ login: "someone" }] },
    { updated_at: "2025-01-01" },
    { state: "closed" },
    { pull_request: {} },
  ])
    assert.equal(
      screenIssue(
        { ...issue, ...changes },
        { kinds: ["polish"], pace: "quick" },
        now,
      ).eligible,
      false,
    );
});
test("unrelated work is excluded rather than filling the shortlist", () =>
  assert.equal(
    screenIssue(
      { ...issue, title: "Refactor database index", body: null },
      { kinds: ["polish"], pace: "quick" },
      now,
    ).eligible,
    false,
  ));
test("short time budgets without beginner evidence carry an uncertainty", () =>
  assert.ok(
    screenIssue(issue, { kinds: ["polish"], pace: "quick" }, now).cautions.some(
      (c) => c.includes("unconfirmed"),
    ),
  ));
