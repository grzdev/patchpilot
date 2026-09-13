import { logAIResponse } from "./ai-diagnostics";
import { GitHubError } from "./github";
export class ProviderUnavailable extends GitHubError {}
export async function provider<T>(url: string, headers: Record<string,string>, body: unknown, name: string) {
  const id=crypto.randomUUID(), started=Date.now();
  const request=body as {model?:string;max_tokens?:number;generationConfig?:{maxOutputTokens?:number}};
  const secrets=Object.values(headers).flatMap(v=>[v,v.replace(/^Bearer /i,"")]);
  const metadata={id,provider:name,model:request.model || new URL(url).pathname.split("/").pop(),maxOutputTokens:request.max_tokens || request.generationConfig?.maxOutputTokens};
  let res: Response;
  try { res = await fetch(url, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) }); }
  catch { logAIResponse({...metadata,at:new Date().toISOString(),elapsedMs:Date.now()-started,error:"Network failure or timeout"},secrets); throw new ProviderUnavailable(`${name} did not respond in time. Please retry.`, 504, name); }
  const raw=await res.text();
  let payload:unknown;
  try {payload=JSON.parse(raw);} catch {payload={nonJsonBody:raw};}
  logAIResponse({...metadata,at:new Date().toISOString(),elapsedMs:Date.now()-started,status:res.status,response:payload},secrets);
  if (!res.ok) {
    let retryAfterSeconds: number | undefined;
    const header = res.headers.get("retry-after");
    if (header) {
      const numeric = Number(header);
      const delay = Number.isFinite(numeric) ? numeric : (Date.parse(header)-Date.now())/1000;
      if (Number.isFinite(delay) && delay > 0) retryAfterSeconds = Math.ceil(delay);
    }
    // Only extract typed retry metadata, never return raw provider bodies or credentials.
    if (name === "Gemini" && res.status === 429 && !retryAfterSeconds) {
      try {
        const data = payload as {error?:{details?:{[key:string]:unknown}[]}};
        const detail = data.error?.details?.find(d => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo");
        const delay = typeof detail?.retryDelay === "string" && /^\d+(\.\d+)?s$/.test(detail.retryDelay) ? Number(detail.retryDelay.slice(0,-1)) : 0;
        if (delay > 0) retryAfterSeconds = Math.ceil(delay);
      } catch {}
    }
    if(res.status===400) {
      const code=(payload as {error?:{code?:unknown}})?.error?.code;
      const message=code === "json_validate_failed" ? "Groq could not produce the required JSON response. This is an output-format failure, not proof that credits are exhausted." : code === "context_length_exceeded" ? "The review exceeded the model context limit. Choose a smaller area." : `${name} rejected the review request (400). This does not establish that your quota is exhausted. Diagnostic ${id} has been saved for investigation.`;
      throw new GitHubError(message,400,name);
    }
    const ErrorType = res.status === 429 || res.status >= 500 ? ProviderUnavailable : GitHubError;
    throw new ErrorType(res.status === 429
      ? `${name} quota reached.${name === "Gemini" ? " Check the selected model's available quota in Google AI Studio. A rate limit may reset soon; a daily or unavailable free-tier allowance may not." : " Check your provider allowance before retrying."}`
      : `${name} request failed (${res.status}). Check server configuration and model access.`, res.status === 429 ? 429 : 502, name, retryAfterSeconds);
  }
  try { return JSON.parse(raw) as T; }
  catch { throw new GitHubError(`Provider returned non-JSON data. Diagnostic ${id}.`,502,name); }
}
