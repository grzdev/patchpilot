import test from "node:test";
import assert from "node:assert/strict";
import {repositoryInput} from "../lib/repository-input.ts";
test("submitted repositories normalize independently of discovery filters",()=>{
  for(const value of ["https://github.com/grzdev/portfolio","grzdev/portfolio","https://github.com/grzdev/portfolio.git/","github.com/grzdev/portfolio","https://github.com/grzdev/portfolio/tree/main?tab=readme"]) assert.equal(repositoryInput(value),"grzdev/portfolio");
  assert.equal(repositoryInput("drawing tools"),null);
});
test("invalid repository links return actionable errors",()=>{
  for(const value of ["https://example.com/grzdev/portfolio","https://github.com/grzdev","https://user:password@github.com/o/r","o/../x"]) assert.throws(()=>repositoryInput(value));
});
