import { GitHubError } from "./github";
import type { Scan, ScanEvent, ScanFailure, ScanProgress } from "./scan-types";
export function scanFailure(error: unknown): ScanFailure {
  return error instanceof GitHubError ? {error:error.message,status:error.status,source:error.source,retryAfterSeconds:error.retryAfterSeconds}
    : {error:"The scan could not finish. Please retry.",status:500,source:"PatchPilot"};
}
export function streamScan(run:(report:(progress:ScanProgress)=>void)=>Promise<Scan>, release:(success:boolean)=>void) {
  let disconnected = false;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event:ScanEvent) => { if (!disconnected) controller.enqueue(encoder.encode(JSON.stringify(event)+"\n")); };
      let success = false;
      try {
        send({type:"progress",progress:{stage:"starting",message:"Scan accepted. Preparing repository inspection."}});
        const scan = await run(progress=>send({type:"progress",progress}));
        success = true; send({type:"result",scan});
      } catch (error) { send({type:"error",...scanFailure(error)}); }
      finally { release(success); if (!disconnected) controller.close(); }
    },
    cancel() { disconnected = true; },
  });
}
