import test from "node:test";
import assert from "node:assert/strict";
import { rankProjects, rankIssues, initialProfile } from "../lib/catalog.ts";
test("selected ecosystem outranks language-only matches", () => {
  const results = rankProjects({
    ...initialProfile,
    skills: ["TypeScript"],
    interests: ["ai"],
  });
  assert.equal(results[0].category, "ai");
});
test("exploring a new stack prioritizes unfamiliar languages within an interest", () => {
  const results = rankProjects({
    ...initialProfile,
    skills: ["TypeScript"],
    interests: ["tooling"],
    discovery: "new",
  });
  assert.equal(results[0].language, "JavaScript");
});
test("issue ordering respects work preference without mutating live data", () => {
  const issues = [
    { number: 1, labels: [{ name: "bug" }] },
    { number: 2, labels: [{ name: "documentation" }] },
    { number: 3, labels: [] },
  ];
  assert.equal(
    rankIssues(issues, { ...initialProfile, kinds: ["docs"] })[0].number,
    2,
  );
  assert.deepEqual(
    issues.map((i) => i.number),
    [1, 2, 3],
  );
});
test("quick wins boost explicitly beginner-labeled issues", () => {
  const issues = [
    { number: 1, labels: [] },
    { number: 2, labels: [{ name: "good first issue" }] },
  ];
  assert.equal(rankIssues(issues, initialProfile)[0].number, 2);
});
