import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
// Transpile only application TypeScript; credentials are dummy values in this test process.
registerHooks({
  resolve(specifier,context,next) {
    if (specifier.startsWith("./") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) return next(specifier+".ts",context);
    return next(specifier,context);
  },
  load(url,context,next) {
    if (url.endsWith(".ts") && !url.includes("node_modules")) return {format:"module",shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};
    return next(url,context);
  }
});
const {scanRepository} = await import("../lib/scanner.ts");
const originalFetch=globalThis.fetch;
const finding={title:"Counter ignores input",kind:"defect",path:"src/a.ts",line:1,evidence:"return 1;",impact:"Every input returns one.",verification:"Call with two and assert expected output.",effort:"One hour, unverified"};
function mock({badEvidence=false,quota=false,anakinFailure=false}={}) {
  const calls=[];
  globalThis.fetch=async (url,options)=>{
    calls.push(String(url));
    if (String(url).includes("api.groq.com")) {
      assert.equal(options.headers.Authorization,"Bearer dummy-groq");
      if(quota) return Response.json({}, {status:429});
      return Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify({findings:[{...finding,evidence:badEvidence?"invented":finding.evidence}]})}}]});
    }
    if(String(url).includes("anakin")) return anakinFailure ? Response.json({}, {status:503}) : Response.json({results:[{title:"Reference",url:"https://example.org/docs",snippet:"Check behavior."}]});
    if(String(url).includes("/search/issues")) return Response.json({items:[]});
    if(String(url).includes("/git/blobs/")) return Response.json({encoding:"base64",content:Buffer.from("return 1;").toString("base64")});
    if(String(url).includes("/git/trees/")) return Response.json({truncated:false,tree:[{path:"src/a.ts",type:"blob",mode:"100644",sha:"blob",size:9}]});
    if(String(url).includes("/commits/")) return Response.json({sha:"abc123"});
    return Response.json({private:false,default_branch:"main"});
  };
  return calls;
}
process.env.GROQ_API_KEY="dummy-groq";
process.env.GEMINI_API_KEY="dummy-gemini";
process.env.ANAKIN_API_KEY="dummy-anakin";
process.env.GEMINI_MODEL="gemini-2.5-flash";
delete process.env.GITHUB_TOKEN;
test("source scan checks duplicates after code analysis and tolerates research failure",async()=>{
  try {
    const calls=mock({anakinFailure:true});
    const scan=await scanRepository("owner/repo",{kinds:["bug"],pace:"quick"},"");
    assert.equal(scan.findings.length,1);
    assert.equal(scan.findings[0].sourceUrl,"https://github.com/owner/repo/blob/abc123/src/a.ts#L1");
    assert.ok(calls.findIndex(u=>u.includes("/search/issues"))>calls.findIndex(u=>u.includes("api.groq.com")));
    assert.ok(scan.warnings.some(w=>w.includes("Anakin research was unavailable")));
  } finally {globalThis.fetch=originalFetch;}
});
test("fabricated citations never reach findings or duplicate/research requests",async()=>{
  try {
    const calls=mock({badEvidence:true});
    const scan=await scanRepository("owner/repo",{kinds:["bug"],pace:"quick"},"");
    assert.equal(scan.findings.length,0);
    assert.ok(!calls.some(u=>u.includes("/search/issues") || u.includes("anakin")));
  } finally {globalThis.fetch=originalFetch;}
});
test("Groq quota failure returns an actionable safe error",async()=>{
  try {
    mock({quota:true});
    await assert.rejects(scanRepository("owner/repo",{kinds:[],pace:"quick"},""),/Groq quota reached/);
  } finally {globalThis.fetch=originalFetch;}
});

const {provider} = await import("../lib/scanner.ts");
const {GitHubError,github} = await import("../lib/github.ts");
const {streamScan} = await import("../lib/scan-stream.ts");
const {createScanLimiter} = await import("../lib/scan-limit.ts");
const {readScanStream} = await import("../lib/read-scan-stream.ts");
test("progress arrives before the scan finishes; errors retain provider and retry hint",async()=>{
  let finish;
  const pending = new Promise((_,reject)=>{finish=reject;});
  let released;
  const reader = streamScan(async report=>{
    report({stage:"review",message:"Waiting for Gemini"});
    return pending;
  },value=>{released=value;}).getReader();
  const first = await reader.read();
  assert.match(new TextDecoder().decode(first.value),/Scan accepted/);
  assert.equal(released,undefined);
  finish(new GitHubError("Gemini quota reached",429,"Gemini",12));
  let text="";
  while(true) {const chunk=await reader.read();if(chunk.done)break;text+=new TextDecoder().decode(chunk.value);}
  assert.match(text,/"source":"Gemini"/);
  assert.match(text,/"retryAfterSeconds":12/);
  assert.equal(released,false);
});
test("completed and failed scans release immediately; overlapping scans remain guarded",()=>{
  const limit=createScanLimiter();
  const release=limit.acquire("user");
  assert.throws(()=>limit.acquire("user"),e=>e.status===409 && e.source==="PatchPilot");
  release(false);
  limit.acquire("user")(true);
  limit.acquire("user")(true);
});
test("Gemini retry metadata is preserved without forwarding provider messages",async()=>{
  try {
    globalThis.fetch=async()=>Response.json({error:{message:"PRIVATE upstream detail",details:[{"@type":"type.googleapis.com/google.rpc.RetryInfo",retryDelay:"23.2s"}]}},{status:429});
    await assert.rejects(provider("https://example.org",{}, {},"Gemini"),e=>e.source==="Gemini" && e.retryAfterSeconds===24 && !e.message.includes("PRIVATE"));
  } finally {globalThis.fetch=originalFetch;}
});
test("GitHub distinguishes permission errors from quota errors",async()=>{
  try {
    globalThis.fetch=async()=>Response.json({},{status:403});
    await assert.rejects(github("/repos/o/r"),e=>e.status===403);
    globalThis.fetch=async()=>Response.json({},{status:403,headers:{"x-ratelimit-remaining":"0","retry-after":"37"}});
    await assert.rejects(github("/repos/o/r"),e=>e.status===429 && e.source==="GitHub" && e.retryAfterSeconds===37);
  } finally {globalThis.fetch=originalFetch;}
});
test("client parser handles split UTF-8 events and reports truncated streams",async()=>{
  const payload=new TextEncoder().encode(JSON.stringify({type:"progress",progress:{stage:"files",message:"Reading café.ts"}})+"\n"+JSON.stringify({type:"error",source:"Gemini",error:"Quota",status:429})+"\n");
  const events=[];
  await readScanStream(new ReadableStream({start(c){for(const byte of payload)c.enqueue(new Uint8Array([byte]));c.close();}}),e=>events.push(e));
  assert.equal(events[0].progress.message,"Reading café.ts");assert.equal(events[1].source,"Gemini");
  await assert.rejects(readScanStream(new ReadableStream({start(c){c.close();}}),()=>{}),/connection ended/);
});
test("scan progress follows actual pipeline stages",async()=>{
  try {
    mock();const events=[];
    await scanRepository("owner/repo",{kinds:["bug"],pace:"quick"},"",e=>events.push(e));
    assert.deepEqual([...new Set(events.map(e=>e.stage))],["repository","tree","files","review","evidence","duplicates","research","complete"]);
    assert.ok(events.some(e=>e.message.includes("Collected 1 files")));
  } finally {globalThis.fetch=originalFetch;}
});

const {selectReviewers,analyzeSample}=await import("../lib/reviewers.ts");

const {redactDiagnostic}=await import("../lib/ai-diagnostics.ts");
test("diagnostics redact active credentials and bearer tokens",()=>{
  const text=redactDiagnostic({body:"echo very-private-key Bearer tokenvalue",usage:12},["very-private-key"]);
  assert.ok(!text.includes("very-private-key"));assert.ok(!text.includes("tokenvalue"));assert.ok(text.includes("usage"));
});


test("only Groq is selectable even when other credentials exist",()=>{
  assert.equal(selectReviewers("auto")[0].name,"Groq");
  assert.equal(selectReviewers("groq")[0].model,"openai/gpt-oss-120b");
  for(const choice of ["orca","hy3","glm","gemini","openrouter","compare"]) assert.throws(()=>selectReviewers(choice),/Only Groq/);
});

test("Groq bad requests preserve 400 and do not expose provider contents",async()=>{
  try {
    globalThis.fetch=async()=>Response.json({error:{code:"json_validate_failed",message:"PRIVATE upstream detail"}},{status:400});
    await assert.rejects(provider("https://example.org",{}, {},"Groq"),e=>e.status===400 && /output-format failure/.test(e.message) && !e.message.includes("PRIVATE"));
    globalThis.fetch=async()=>Response.json({error:{message:"PRIVATE upstream detail"}},{status:400});
    await assert.rejects(provider("https://example.org",{}, {},"Groq"),e=>e.status===400 && /Diagnostic/.test(e.message) && !e.message.includes("PRIVATE"));
  } finally {globalThis.fetch=originalFetch;}
});
