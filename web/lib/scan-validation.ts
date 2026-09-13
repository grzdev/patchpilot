import { z } from "zod";
export const findingSchema = z.object({
  title: z.string().min(1).max(180), kind: z.enum(["defect", "ux"]),
  path: z.string().max(300), line: z.number().int().positive(),
  evidence: z.string().min(1).max(1800), impact: z.string().min(1).max(2000),
  verification: z.string().min(1).max(2000), effort: z.string().max(160),
});
export const outputSchema = z.object({ findings: z.array(findingSchema).max(5) });
export function eligiblePath(path: string) {
  return !/(^|\/)(\.[^/]+|node_modules|vendor|dist|build|coverage|fixtures|generated)(\/|$)/i.test(path)
    && !/(secret|credential|lock|\.min\.)/i.test(path)
    && (path === "package.json" || /\.(tsx?|jsx?|mjs|py|go|rs|java|vue|svelte|rb|css|md|mdx)$/.test(path));
}
export function matchesEvidence(f: z.infer<typeof findingSchema>, files: {path:string; content:string}[]) {
  const file = files.find(file => file.path === f.path);
  if (!file) return false;
  const lines = file.content.split("\n");
  const excerpt = f.evidence.replace(/\r/g, "").trim();
  return f.line <= lines.length && lines.slice(f.line - 1, f.line - 1 + excerpt.split("\n").length).join("\n").trim() === excerpt;
}
