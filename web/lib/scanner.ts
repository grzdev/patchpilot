import { normalizeScope, inScope } from "./scan-scope";
import { github, GitHubError } from "./github";
import { eligiblePath } from "./scan-validation";
import type { Scan, Finding, ScanProgress } from "./scan-types";

import { scanCacheKey, getCachedScan, setCachedScan } from "./scan-cache";
import { provider } from "./ai-http";
export { provider } from "./ai-http";
import { analyzeSample, selectReviewers } from "./reviewers";
export async function scanRepository(
  repo: string,
  preferences: {kinds: string[]; pace: string},
  focus: string,
  report: (event: ScanProgress) => void = () => {},
  reviewer = "groq",
  batchOptions?: { skipFiles?: string[]; batchIndex?: number; cache?: boolean; commit?: string }
): Promise<Scan> {
  const reviewers = selectReviewers(reviewer);
  try {focus=normalizeScope(focus);} catch {throw new GitHubError("Choose a valid folder within this repository.",400,"PatchPilot");}
  report({stage:"repository",message:`Checking public repository ${repo}.`});
  const meta = await github<{private:boolean; default_branch:string}>(`/repos/${repo}`,batchOptions?.cache ? 60000 : 0);
  if (meta.private) throw new GitHubError("This prototype scans public repositories only.", 400);
  const head = await github<{sha:string}>(`/repos/${repo}/commits/${encodeURIComponent(batchOptions?.commit || meta.default_branch)}`);
  
  let skipFiles = [...new Set(batchOptions?.skipFiles || [])];
  const batchIndex = batchOptions?.batchIndex || 0;
  const enableCache = batchOptions?.cache ?? false;
  const cacheKey = scanCacheKey(repo, head.sha, focus, preferences.kinds, preferences.pace, batchIndex, skipFiles);
  if (enableCache) {
    const cached = getCachedScan(cacheKey);
    if (cached) {
      report({stage:"complete",message:`Loaded investigation from cache for commit ${head.sha.slice(0,8)}.`});
      return { ...cached, fromCache: true };
    }
  }

  report({stage:"tree",message:`Pinned commit ${head.sha.slice(0,8)}. Reading the file tree.`});
  const tree = await github<{truncated:boolean; tree:{path:string; type:string; size?:number; sha:string; mode:string}[]}>(`/repos/${repo}/git/trees/${head.sha}?recursive=1`,batchOptions?.cache ? 900000 : 0);
  const candidates = tree.tree.filter(f => f.type === "blob" && f.mode === "100644" && (f.size ?? 99999) <= 10000 && eligiblePath(f.path) && inScope(f.path,focus));
  candidates.sort((a,b) => Number(/test|spec/.test(a.path)) - Number(/test|spec/.test(b.path)) || a.path.localeCompare(b.path));
  
  skipFiles = skipFiles.filter(path => candidates.some(f => f.path === path));
  const unreviewedCandidates = candidates.filter(f => !skipFiles.includes(f.path));
  if (candidates.length > 0 && unreviewedCandidates.length === 0) {
    report({stage:"complete",message:"All eligible files in this area have already been inspected."});
    return {
      focus, sampleBudget: 10000, contextFiles: [], comparisons: [], repo, commit: head.sha,
      files: [], eligible: candidates.length, findings: [],
      warnings: ["All eligible files in this area have already been inspected across previous batches."],
      research: [], scannedAt: new Date().toISOString(), batchIndex, reviewedCount: skipFiles.length,
      totalEligible: candidates.length, remainingCount: 0, hasMore: false, allReviewedFiles: skipFiles
    };
  }

  const selected = [...unreviewedCandidates];
  const manifest=tree.tree.find(f=>f.path === "package.json" && f.type === "blob" && f.mode === "100644" && (f.size ?? 99999) <= 3000);
  if(manifest && !selected.some(f=>f.path===manifest.path)) {const index=selected.findIndex(f=>f.path === manifest.path);if(index>=0)selected.splice(index,1);selected.push(manifest);}
  report({stage:"files",message:`Batch ${batchIndex + 1}: ${unreviewedCandidates.length} unreviewed eligible files; selected ${selected.length} for this sample.`});
  const files: {path:string; content:string}[] = [];
  const warnings: string[] = ["Eligibility excludes unsupported paths and files larger than 10,000 bytes. This is not a complete repository audit."];
  const sampleBudget = 10000;
  let budget = sampleBudget;
  for (const file of selected) {
    if ((file.size ?? 0) > budget) continue;
    report({stage:"files",message:`Retrieving ${file.path} (${files.length} files collected).`});
    try {
      const blob = await github<{encoding:string; content:string}>(`/repos/${repo}/git/blobs/${file.sha}`,batchOptions?.cache ? 900000 : 0);
      if (blob.encoding !== "base64") continue;
      const content = Buffer.from(blob.content, "base64").toString("utf8");
      if (content.includes("\0") || content.length > budget) continue;
      files.push({path:file.path,content}); budget -= content.length;
    } catch (error) {
      if (error instanceof GitHubError && [429,403].includes(error.status)) throw error;
      warnings.push(`Could not retrieve ${file.path}.`);
      report({stage:"files",message:`Skipped ${file.path}: retrieval failed.`});
    }
  }
  if (!files.some(file=>inScope(file.path,focus))) throw new GitHubError("No supported source files fit this scan. Try another folder or repository.", 422, "PatchPilot");
  if (tree.truncated) warnings.push("GitHub truncated the repository tree; some paths were not available.");
  warnings.push("Partial source review only. Tests have not run; findings need reproduction. Effort is a model estimate, and mergeability is not guaranteed.");
  report({stage:"review",message:`Collected ${files.length} files (${sampleBudget-budget} characters). Starting model reviews.`});
  const {valid, comparisons} = await analyzeSample(reviewers, {repo,commit:head.sha,preferences,files},report);
  for (const comparison of comparisons) {
    if (comparison.error) warnings.push(`${comparison.provider}: ${comparison.error}`);
    else if (comparison.valid < comparison.proposed) warnings.push(`${comparison.provider}: some suggestions failed citation or work-type validation.`);
  }
  const findings: Finding[] = [];
  for (const f of valid) {
    report({stage:"duplicates",message:`Checking related issues and PRs for candidate ${findings.length+1} of ${valid.length}: ${f.title}`});
    let related: Finding["related"] = [], duplicateStatus = "Duplicate check unavailable";
    try {
      const terms = f.title.replace(/[^a-zA-Z0-9 ]/g," ").split(/\s+/).filter(w => w.length > 3).slice(0,4).join(" ");
      const matches = await github<{items:{title:string;html_url:string}[]}>(`/search/issues?q=${encodeURIComponent(`repo:${repo} ${terms}`)}&per_page=5`);
      related = matches.items.map(i => ({title:i.title,url:i.html_url}));
      duplicateStatus = related.length ? "Possible related issues or PRs — review before starting" : "No keyword matches found; this does not prove the work is new";
    } catch { warnings.push(`Duplicate search failed for: ${f.title}`); }
    findings.push({...f,sourceUrl:`https://github.com/${repo}/blob/${head.sha}/${f.path.split("/").map(encodeURIComponent).join("/")}#L${f.line}`,related,duplicateStatus});
  }
  let research: Scan["research"] = [];
  if (process.env.ANAKIN_API_KEY && findings.length) {
    report({stage:"research",message:"Requesting Anakin documentation references for the first candidate."});
    try {
      const data = await provider<{results:{url:string;title:string;snippet:string}[]}>("https://api.anakin.io/v1/search", {"X-API-Key":process.env.ANAKIN_API_KEY}, {prompt:`Find official documentation relevant to verifying this suspected code behavior in ${repo}: ${findings[0].title}. Return source references.`,limit:3}, "Anakin");
      if (!Array.isArray(data.results)) throw new Error();
      research = data.results.filter((r:{url?:unknown;title?:unknown;snippet?:unknown}) => typeof r.url === "string" && /^https:\/\//.test(r.url) && typeof r.title === "string" && typeof r.snippet === "string").slice(0,3).map((r:{url:string;title:string;snippet:string}) => ({url:r.url,title:r.title.slice(0,200),snippet:r.snippet.slice(0,1500)}));
      if (!research.length) warnings.push("Anakin returned no usable research references.");
    } catch { warnings.push("Anakin research was unavailable. Source findings are retained without external corroboration."); }
  } else warnings.push(findings.length ? "Anakin is not configured; external research was skipped." : "External research was skipped because there were no validated findings.");
  const batchInspected = files.filter(f => inScope(f.path, focus)).map(f => f.path);
  const allReviewed = [...new Set([...skipFiles, ...batchInspected])];
  const remainingCount = candidates.filter(f => !allReviewed.includes(f.path)).length;
  const hasMore = remainingCount > 0;
  report({stage:"complete",message:`Investigation complete: ${findings.length} candidates, ${research.length} research references. ${remainingCount} eligible files remain.`});
  const result: Scan = {
    preferences, focus, sampleBudget, contextFiles: files.filter(f=>!inScope(f.path,focus)).map(f=>f.path),
    comparisons, repo, commit: head.sha, files: files.map(f=>f.path), eligible: candidates.length,
    findings, warnings, research, scannedAt: new Date().toISOString(),
    batchIndex, reviewedCount: allReviewed.length, totalEligible: candidates.length,
    remainingCount, hasMore, allReviewedFiles: allReviewed
  };
  if (enableCache) setCachedScan(cacheKey, result);
  return result;
}
