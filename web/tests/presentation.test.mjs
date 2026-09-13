import test from "node:test";
import assert from "node:assert/strict";
import {normalizeScope,inScope,folderOptions} from "../lib/scan-scope.ts";
import {prDraft,readableReference} from "../lib/presentation.ts";
test("scope respects folder boundaries and accepts slash-prefixed folders",()=>{
  assert.equal(normalizeScope(" /src/components/ "),"src/components");
  assert.equal(inScope("src/components/Button.tsx","src/components"),true);
  assert.equal(inScope("src/components-old/Button.tsx","src/components"),false);
  assert.equal(inScope("src/utils.ts","src/utils.ts"),true);
  assert.throws(()=>normalizeScope("../outside"));
});
test("folder picker counts actual files under each nested folder",()=>{
  assert.deepEqual(folderOptions([{path:"src/components/a.ts"},{path:"src/utils/b.ts"}]),[{path:"src",count:2},{path:"src/components",count:1},{path:"src/utils",count:1}]);
});
test("PR draft does not claim tests or implementation have happened",()=>{
  const draft=prDraft({commit:"abc"},{kind:"defect",title:"Check input",impact:"May reject valid input",path:"src/a.ts",sourceUrl:"https://github.com/o/r",verification:"Try a valid input"});
  assert.match(draft.description,/no fix has been implemented/);assert.match(draft.description,/no tests have been run/);assert.match(draft.description,/Try a valid input/);
});
test("reference cards suppress server error pages and avoid raw snippet syntax",()=>{
  assert.equal(readableReference({title:"Moved",url:"https://example.org",snippet:"The document has moved here"}),null);
  assert.equal(readableReference({title:"Unsafe",url:"javascript:alert(1)",snippet:"x"}),null);
  assert.deepEqual(readableReference({title:"  PostCSS docs ",url:"https://postcss.org/docs",snippet:"* syntax | raw | nav"}),{title:"PostCSS docs",url:"https://postcss.org/docs",host:"postcss.org"});
});
