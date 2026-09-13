import { GitHubError } from "./github";
export function createScanLimiter() {
  const active = new Set<string>();
  return { acquire(user: string, _now = Date.now()) {
    if (active.has(user)) throw new GitHubError("You already have a scan running. Wait for it to finish.",409,"PatchPilot");
    active.add(user);
    return (_success: boolean, _finishTime = Date.now()) => {active.delete(user);};
  }};
}
