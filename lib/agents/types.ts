export type Asset =
  | "BTC"
  | "LTC"
  | "XLM"
  | "cbBTC"
  | "cbLTC"
  | "USDC"
  | "DIGITAL_ASSETS";

export type Confidence = "A" | "B" | "C" | "D" | "Q";

export type AgentName =
  | "source-scout"
  | "etf-flow"
  | "treasury-ledger"
  | "policy-sovereign"
  | "network-intelligence"
  | "morpho-risk"
  | "verification"
  | "editor-publisher"
  | "commerce";

export type RunStatus =
  | "pending"
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "quarantined";

export interface SourceReference {
  sourceId: string;
  url: string;
  title?: string;
  publishedAt?: string;
  retrievedAt: string;
  rawContentHash?: string;
}

export interface Observation<T = unknown> {
  id: string;
  agent: AgentName;
  category: string;
  assets: Asset[];
  observedAt: string;
  retrievedAt: string;
  data: T;
  sources: SourceReference[];
  confidence: Confidence;
  isEstimate: boolean;
  warnings: string[];
  parserVersion: string;
}

export interface Claim {
  id: string;
  text: string;
  category: "fact" | "estimate" | "interpretation";
  asOf: string;
  sourceIds: string[];
  confidence: Confidence;
  calculationId?: string;
  notes?: string;
}

export interface AgentRunResult {
  agent: AgentName;
  status: RunStatus;
  startedAt: string;
  completedAt: string;
  observations: Observation[];
  claims: Claim[];
  warnings: string[];
  error?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  status: RunStatus;
  freshnessAt?: string;
  claims: Claim[];
  warnings: string[];
}

export interface DailyReportRun {
  runId: string;
  reportDate: string;
  timezone: "America/New_York";
  methodologyVersion: string;
  status: RunStatus;
  startedAt: string;
  completedAt: string;
  agentResults: AgentRunResult[];
  sections: ReportSection[];
  publicationGate: {
    passed: boolean;
    reasons: string[];
  };
}

export interface AgentContext {
  runId: string;
  reportDate: string;
  cutoffAt: string;
  dryRun: boolean;
}

export interface IntelligenceAgent {
  name: AgentName;
  execute(context: AgentContext): Promise<AgentRunResult>;
}
