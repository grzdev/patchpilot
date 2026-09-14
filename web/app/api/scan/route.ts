import { z } from "zod";
import { getIdentity, isSameOrigin } from "@/lib/oauth";
import { scanRepository } from "@/lib/scanner";
import { repoPath, GitHubError } from "@/lib/github";
const input = z.object({
  reviewer: z.literal("groq").default("groq"),
  repo: z.string().max(200),
  kinds: z.array(z.string().max(30)).max(10),
  pace: z.enum(["quick", "challenge", "deep"]),
  focus: z.string().max(160).default(""),
  skipFiles: z.array(z.string().max(300)).max(200).default([]),
  commit: z.string().regex(/^[a-f0-9]{40}$/i).optional(),
  batchIndex: z.number().int().min(0).max(100).default(0)
});
import { createScanLimiter } from "@/lib/scan-limit";
import { streamScan, scanFailure } from "@/lib/scan-stream";
const limiter = createScanLimiter();
export async function POST(request: Request) {
  let username: string | undefined;
  try {
    if (!isSameOrigin(request)) throw new GitHubError("Use the scan button from PatchPilot.",403,"PatchPilot");
    const identity = await getIdentity(request).json() as {profile:{username:string}|null};
    username = identity.profile?.username;
    if (!username) throw new GitHubError("Sign in with GitHub before running a scan.",401,"PatchPilot");
    const text = await request.text();
    if (text.length > 15000) throw new GitHubError("Scan request is too large.",400,"PatchPilot");
    const parsed = input.safeParse(JSON.parse(text));
    if (!parsed.success) throw new GitHubError("Choose a valid repository and scan preferences.",400,"PatchPilot");
    const args = parsed.data;
    const repo = repoPath(args.repo);
    const release = limiter.acquire(username);
    return new Response(streamScan(report=>scanRepository(repo,args,args.focus,report,args.reviewer,{skipFiles:args.skipFiles,batchIndex:args.batchIndex,cache:true,commit:args.commit}),release), {
      headers:{"Content-Type":"application/x-ndjson; charset=utf-8","Cache-Control":"no-cache, no-store, no-transform","X-Accel-Buffering":"no"},
    });
  } catch (error) {
    const info = scanFailure(error instanceof SyntaxError ? new GitHubError("Invalid scan request.",400,"PatchPilot") : error);
    return Response.json(info,{status:info.status,headers:{"Cache-Control":"no-store",...(info.retryAfterSeconds ? {"Retry-After":String(info.retryAfterSeconds)} : {})}});
  }
}
