import test from "node:test";
import assert from "node:assert/strict";
import {mixProjects} from "../lib/discovery-mix.ts";
const items=[{repo:"a/one",language:"TypeScript"},{repo:"a/two",language:"Python"},{repo:"a/three",language:"TypeScript"},{repo:"a/four",language:"Go"}];
test("mixed discovery alternates familiar and new languages without losing repositories",()=>{
  const before=JSON.stringify(items);
  const result=mixProjects(items,{skills:["TypeScript"],discovery:"mixed"},()=>0.5);
  assert.deepEqual(result.map(p=>p.language==="TypeScript"),[true,false,true,false]);
  assert.equal(new Set(result.map(p=>p.repo)).size,4);
  assert.equal(JSON.stringify(items),before);
});
test("familiar and new preferences prioritize the appropriate group",()=>{
  assert.equal(mixProjects(items,{skills:["TypeScript"],discovery:"familiar"},()=>0.5)[0].language,"TypeScript");
  assert.notEqual(mixProjects(items,{skills:["TypeScript"],discovery:"new"},()=>0.5)[0].language,"TypeScript");
  assert.equal(mixProjects(items,{skills:[],discovery:"mixed"},()=>0.5).length,4);
});
