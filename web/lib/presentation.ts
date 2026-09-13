import type { Finding, Scan } from "./scan-types";
export function prDraft(scan:Scan,f:Finding) {
  return {title:`${f.kind === "ux" ? "enhancement" : "fix"}: ${f.title}`,description:`## Proposed change\nInvestigate and address: ${f.title}\n\n## Motivation\n${f.impact}\n\n## Scope\n${f.path} (reviewed at ${scan.commit})\nEvidence: ${f.sourceUrl}\n\n## Verification plan\n${f.verification}\n\n## Before opening this PR\n- Confirm the finding on the current branch.\n- Describe the actual changes made.\n- Replace this checklist with the tests run and their results.\n- Check contribution guidance and related work.\n\nDraft only: no fix has been implemented and no tests have been run by PatchPilot.`};
}
export function readableReference(reference:{title:string;url:string;snippet:string}) {
  try {
    const url=new URL(reference.url);
    if(url.protocol !== "https:" || /document has moved|server at .*port|404 not found|access denied/i.test(reference.snippet))return null;
    return {title:reference.title.replace(/\s+/g," ").trim(),url:reference.url,host:url.hostname.replace(/^www\./,"")};
  } catch {return null;}
}
