import { GitHubError } from "./github";
import type { ScanProgress } from "./scan-types";
// Per-process FIFO. A distributed deployment needs shared queue storage.
let tail: Promise<void> = Promise.resolve();
let pending = 0;
export async function queueReview<T>(run: () => Promise<T>, report: (p: ScanProgress) => void): Promise<T> {
  if (pending >= 2) throw new GitHubError("Both review slots are occupied. Your previous findings are retained; retry shortly.",503,"PatchPilot",15);
  const ahead = pending++;
  const previous = tail;
  let release!: () => void;
  tail = new Promise<void>(resolve => { release = resolve; });
  if (ahead) report({stage:"queue",message:`Waiting for reviewer capacity. ${ahead} batch${ahead === 1 ? "" : "es"} ahead; your collected files are retained.`});
  await previous;
  try { return await run(); }
  finally { pending--; release(); }
}
