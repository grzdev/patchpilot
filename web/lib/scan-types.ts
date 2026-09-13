export type Comparison = {provider:string;requestedModel:string;model:string;milliseconds:number;proposed:number;valid:number;error?:string};
export type Finding = {
  reviewer?: string;
  title: string; kind: "defect" | "ux"; path: string; line: number;
  evidence: string; impact: string; verification: string; effort: string;
  sourceUrl: string; duplicateStatus: string;
  related: { title: string; url: string }[];
};
export type Scan = {
  preferences?: {kinds:string[];pace:string};
  focus?:string;sampleBudget?:number;contextFiles?:string[];
  comparisons?: Comparison[];
  repo: string; commit: string; files: string[]; eligible: number;
  findings: Finding[]; warnings: string[]; scannedAt: string;
  research: { title: string; url: string; snippet: string }[];
  batchIndex?: number;
  reviewedCount?: number;
  totalEligible?: number;
  remainingCount?: number;
  hasMore?: boolean;
  allReviewedFiles?: string[];
  fromCache?: boolean;
};

export type ScanProgress = { stage: string; message: string };
export type ScanFailure = { error: string; source: string; status: number; retryAfterSeconds?: number };
export type ScanEvent =
  | { type: "progress"; progress: ScanProgress }
  | { type: "result"; scan: Scan }
  | ({ type: "error" } & ScanFailure);
