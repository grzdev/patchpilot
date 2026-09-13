import test from "node:test";
import assert from "node:assert/strict";
import { eligiblePath, matchesEvidence, outputSchema } from "../lib/scan-validation.ts";
test("scanner excludes hidden, generated, credential and unsupported files",()=>{
  for (const path of [".env.local","src/.env.ts","vendor/code.js","src/credentials.ts","dist/app.js","image.png","src/app.min.js"]) assert.equal(eligiblePath(path),false,path);
  assert.equal(eligiblePath("src/router.ts"),true);
});
test("findings must match the exact source at the claimed line",()=>{
  const files=[{path:"src/a.ts",content:"first\nreturn input + 1;\nlast"}];
  const f={path:"src/a.ts",line:2,evidence:"return input + 1;"};
  assert.equal(matchesEvidence(f,files),true);
  assert.equal(matchesEvidence({...f,line:1},files),false);
  assert.equal(matchesEvidence({...f,evidence:"return input - 1;"},files),false);
  assert.equal(matchesEvidence({...f,path:"missing.ts"},files),false);
});
test("model cannot label a finding as reproduced and malformed output is rejected",()=>{
  assert.equal(outputSchema.safeParse({findings:[{kind:"reproduced"}]}).success,false);
  assert.deepEqual(outputSchema.parse({findings:[]}),{findings:[]});
});
