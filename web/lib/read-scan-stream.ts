import type { ScanEvent } from "./scan-types";
export async function readScanStream(body: ReadableStream<Uint8Array>, receive:(event:ScanEvent)=>void) {
  const reader = body.getReader(), decoder = new TextDecoder();
  let buffer = "", terminal = false;
  function line(text:string) {
    if (!text.trim()) return;
    const event = JSON.parse(text) as ScanEvent;
    if (terminal) throw new Error("Unexpected data after the scan finished.");
    if (!["progress","result","error"].includes(event.type)) throw new Error("Unrecognized scan response.");
    if (event.type !== "progress") terminal = true;
    receive(event);
  }
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value,{stream:!chunk.done});
      let boundary;
      while ((boundary=buffer.indexOf("\n")) !== -1) {line(buffer.slice(0,boundary));buffer=buffer.slice(boundary+1);}
      if (chunk.done) break;
    }
    if (buffer.trim()) line(buffer);
    if (!terminal) throw new Error("The scan connection ended before a result arrived. Please retry.");
  } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}
