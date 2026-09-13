import { appendFileSync, mkdirSync, existsSync, statSync, renameSync } from "node:fs";
import { join } from "node:path";
export function redactDiagnostic(value:unknown,secrets:string[]=[]):string {
  let text=JSON.stringify(value);
  for(const secret of secrets.filter(s=>s.length>3)) text=text.split(secret).join("[REDACTED]");
  return text.replace(/Bearer\s+[A-Za-z0-9._-]+/gi,"Bearer [REDACTED]").replace(/(?:sk-|AIza)[A-Za-z0-9_-]{12,}/g,"[REDACTED]");
}
export function logAIResponse(record:unknown,secrets:string[] = []) {
  // No request prompts or headers. Provider response bodies can contain source excerpts.
  const line=redactDiagnostic(record,secrets);
  try {
    const directory=join(process.cwd(),".logs");
    mkdirSync(directory,{recursive:true});
    const path=join(directory,"ai-responses.jsonl");
    if(existsSync(path) && statSync(path).size > 10*1024*1024) renameSync(path,join(directory,`ai-responses-${Date.now()}.jsonl`));
    appendFileSync(path,line+"\n","utf8");
  } catch {
    // Hosted Workers may not provide a writable filesystem.
    console.info("[PatchPilot AI diagnostic] "+line);
  }
}
