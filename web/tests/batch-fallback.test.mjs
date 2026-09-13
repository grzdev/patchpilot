import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("./") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts") && !url.includes("node_modules")) {
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
        }).outputText
      };
    }
    return next(url, context);
  }
});

const { scanRepository } = await import("../lib/scanner.ts");
const { createScanLimiter } = await import("../lib/scan-limit.ts");
const { clearScanCache } = await import("../lib/scan-cache.ts");

const originalFetch = globalThis.fetch;
process.env.GROQ_API_KEY = "dummy-groq";
process.env.GEMINI_API_KEY = "dummy-gemini";
process.env.GEMINI_MODEL = "gemini-2.5-flash";
delete process.env.ANAKIN_API_KEY;

test("batch scanning skips previous files and computes accurate remaining counts", async () => {
  try {
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes("api.groq.com")) {
        return Response.json({
          choices: [{
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                findings: [{
                  title: "Bug in file B",
                  kind: "defect",
                  path: "src/b.ts",
                  line: 1,
                  evidence: "export const b = 2;",
                  impact: "Wrong value",
                  verification: "Check b",
                  effort: "10 mins"
                }]
              })
            }
          }]
        });
      }
      if (u.includes("/search/issues")) return Response.json({ items: [] });
      if (u.includes("/git/blobs/blob-b")) return Response.json({ encoding: "base64", content: Buffer.from("export const b = 2;").toString("base64") });
      if (u.includes("/git/trees/")) {
        return Response.json({
          truncated: false,
          tree: [
            { path: "src/a.ts", type: "blob", mode: "100644", sha: "blob-a", size: 10 },
            { path: "src/b.ts", type: "blob", mode: "100644", sha: "blob-b", size: 10 },
            { path: "src/c.ts", type: "blob", mode: "100644", sha: "blob-c", size: 10 }
          ]
        });
      }
      if (u.includes("/commits/")) { assert.ok(u.endsWith("/commits/" + "a".repeat(40))); return Response.json({ sha: "a".repeat(40) }); }
      return Response.json({ private: false, default_branch: "main" });
    };

    // Scan batch 2, skipping src/a.ts
    const scan = await scanRepository(
      "test-owner/batch-repo",
      { kinds: ["defect"], pace: "quick" },
      "",
      () => {},
      "groq",
      { skipFiles: ["src/a.ts", "src/a.ts", "outside/no.ts"], batchIndex: 1, commit: "a".repeat(40) }
    );

    assert.equal(scan.batchIndex, 1);
    assert.equal(scan.totalEligible, 3);
    assert.ok(scan.allReviewedFiles?.includes("src/a.ts"));
    assert.ok(scan.allReviewedFiles?.includes("src/b.ts"));
    assert.equal(scan.reviewedCount, 2);
    assert.equal(scan.remainingCount, 1);
    assert.equal(scan.hasMore, true);
    assert.equal(scan.findings.length, 1);
    assert.equal(scan.findings[0].path, "src/b.ts");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reviewer exclusively queries Groq and never invokes OpenRouter or Gemini", async () => {
  try {
    const calledUrls = [];
    globalThis.fetch = async (url) => {
      const u = String(url);
      calledUrls.push(u);
      if (u.includes("api.groq.com")) {
        return Response.json({
          choices: [{
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                findings: [{
                  title: "Groq discovered defect",
                  kind: "defect",
                  path: "src/a.ts",
                  line: 1,
                  evidence: "const a = 1;",
                  impact: "Impact description",
                  verification: "Verify a",
                  effort: "30m"
                }]
              })
            }
          }]
        });
      }
      if (u.includes("/search/issues")) return Response.json({ items: [] });
      if (u.includes("/git/blobs/")) return Response.json({ encoding: "base64", content: Buffer.from("const a = 1;").toString("base64") });
      if (u.includes("/git/trees/")) return Response.json({ truncated: false, tree: [{ path: "src/a.ts", type: "blob", mode: "100644", sha: "blob-1", size: 12 }] });
      if (u.includes("/commits/")) return Response.json({ sha: "groq-sha" });
      return Response.json({ private: false, default_branch: "main" });
    };

    const scan = await scanRepository(
      "test-owner/groq-repo",
      { kinds: ["defect"], pace: "quick" },
      "",
      () => {},
      "groq"
    );

    assert.ok(calledUrls.some(u => u.includes("api.groq.com")));
    assert.ok(!calledUrls.some(u => u.includes("generativelanguage.googleapis.com")));
    assert.ok(!calledUrls.some(u => u.includes("openrouter.ai")));
    assert.equal(scan.findings.length, 1);
    assert.match(scan.findings[0].reviewer, /Groq/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("caching returns completed scan instantly without repeat API calls", async () => {
  clearScanCache();
  try {
    let networkFetches = 0;
    globalThis.fetch = async (url) => {
      networkFetches++;
      const u = String(url);
      if (u.includes("api.groq.com")) {
        return Response.json({
          choices: [{
            finish_reason: "stop",
            message: { content: JSON.stringify({ findings: [] }) }
          }]
        });
      }
      if (u.includes("/git/blobs/")) return Response.json({ encoding: "base64", content: Buffer.from("const x = 0;").toString("base64") });
      if (u.includes("/git/trees/")) return Response.json({ truncated: false, tree: [{ path: "src/x.ts", type: "blob", mode: "100644", sha: "blob-x", size: 10 }] });
      if (u.includes("/commits/")) return Response.json({ sha: "sha-cached" });
      return Response.json({ private: false, default_branch: "main" });
    };

    // First scan: cache enabled, hits network
    const scan1 = await scanRepository(
      "cache-owner/repo",
      { kinds: ["bug"], pace: "quick" },
      "src",
      () => {},
      "groq",
      { cache: true }
    );
    const initialFetches = networkFetches;
    assert.ok(initialFetches > 0);
    assert.equal(scan1.fromCache, undefined);

    // Second scan: same repo, commit, focus, preferences -> returns from cache immediately!
    const scan2 = await scanRepository(
      "cache-owner/repo",
      { kinds: ["bug"], pace: "quick" },
      "src",
      () => {},
      "groq",
      { cache: true }
    );
    assert.equal(networkFetches, initialFetches + 1); // repository metadata is cached; head is rechecked
    assert.equal(scan2.fromCache, true);
    assert.equal(scan2.commit, "sha-cached");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("limiter blocks overlap but permits immediate continuation", () => {
  const limiter = createScanLimiter();
  const release = limiter.acquire("tester");
  assert.throws(() => limiter.acquire("tester"), e => e.status === 409);
  release(true);
  limiter.acquire("tester")(true);
});

test("review queue serializes callers and releases after failure", async () => {
  const {queueReview} = await import("../lib/review-queue.ts");
  const events = []; let release;
  const gate = new Promise(resolve => {release = resolve;});
  const first = queueReview(async () => {events.push("first"); await gate; throw new Error("failed");},()=>{});
  const failed = assert.rejects(first,/failed/);
  const second = queueReview(async () => {events.push("second");}, p=>events.push(p.stage));
  await Promise.resolve();
  assert.deepEqual(events,["queue","first"]);
  release(); await failed; await second;
  assert.deepEqual(events,["queue","first","second"]);
});

test("transient Groq failure falls back to zero-price OpenRouter", async () => {
  const {analyzeSample} = await import("../lib/reviewers.ts");
  const requests = [];
  try {
    globalThis.fetch = async (url, options) => {
      requests.push(JSON.parse(options.body));
      if(String(url).includes("groq")) return Response.json({}, {status:429});
      return Response.json({model:"test/free",choices:[{finish_reason:"stop",message:{content:'{"findings":[]}'}}]});
    };
    const result = await analyzeSample([
      {name:"Groq",model:"test",key:"dummy",url:"https://groq.test"},
      {name:"OpenRouter",model:"openrouter/free",key:"dummy",url:"https://openrouter.test"}
    ],{repo:"a/b",commit:"abc",preferences:{kinds:[],pace:"quick"},files:[]},()=>{});
    assert.equal(result.comparisons.length,2);
    assert.equal(requests[1].model,"openrouter/free");
    assert.deepEqual(requests[1].provider.max_price,{prompt:0,completion:0});
  } finally {globalThis.fetch = originalFetch;}
});


test("authentication failures do not consume fallback quota", async () => {
  const {analyzeSample} = await import("../lib/reviewers.ts");
  let calls=0;
  try {
    globalThis.fetch=async()=>{calls++;return Response.json({}, {status:401});};
    await assert.rejects(analyzeSample([
      {name:"Groq",model:"test",key:"dummy",url:"https://groq.test"},
      {name:"OpenRouter",model:"openrouter/free",key:"dummy",url:"https://openrouter.test"}
    ],{repo:"a/b",commit:"abc",preferences:{kinds:[],pace:"quick"},files:[]},()=>{}),/401/);
    assert.equal(calls,1);
  } finally {globalThis.fetch=originalFetch;}
});


test("GitHub cache shares concurrent successful requests and retries failures", async()=>{
  const {github}=await import("../lib/github.ts"); let calls=0;
  try {
    globalThis.fetch=async()=>{calls++;return Response.json({value:1});};
    const [a,b]=await Promise.all([github("/test/cache-success",10000),github("/test/cache-success",10000)]);
    a.value=9; assert.equal(b.value,1); assert.equal(calls,1);
    assert.equal((await github("/test/cache-success",10000)).value,1);
    globalThis.fetch=async()=>{calls++;return Response.json({}, {status:429});};
    await assert.rejects(github("/test/cache-failure",10000));
    await assert.rejects(github("/test/cache-failure",10000));
    assert.equal(calls,3);
  } finally {globalThis.fetch=originalFetch;}
});
