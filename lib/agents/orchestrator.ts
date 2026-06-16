import type {
  AgentContext,
  AgentName,
  AgentRunResult,
  DailyReportRun,
  IntelligenceAgent,
  ReportSection,
  RunStatus,
} from "./types";

const TIMEZONE = "America/New_York" as const;
const METHODOLOGY_VERSION = "0.1.0";

function timestamp(): string {
  return new Date().toISOString();
}

function newYorkDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

class ReadOnlyScaffoldAgent implements IntelligenceAgent {
  constructor(
    public readonly name: AgentName,
    private readonly message: string,
  ) {}

  async execute(context: AgentContext): Promise<AgentRunResult> {
    const startedAt = timestamp();
    return {
      agent: this.name,
      status: context.dryRun ? "completed" : "partial",
      startedAt,
      completedAt: timestamp(),
      observations: [],
      claims: [],
      warnings: [this.message],
    };
  }
}

const agents: IntelligenceAgent[] = [
  new ReadOnlyScaffoldAgent("source-scout", "Collectors are pending."),
  new ReadOnlyScaffoldAgent("etf-flow", "ETF adapters are pending."),
  new ReadOnlyScaffoldAgent("treasury-ledger", "Treasury adapters are pending."),
  new ReadOnlyScaffoldAgent("policy-sovereign", "Policy adapters are pending."),
  new ReadOnlyScaffoldAgent("network-intelligence", "Network adapters are pending."),
  new ReadOnlyScaffoldAgent("morpho-risk", "Morpho adapters are pending."),
  new ReadOnlyScaffoldAgent("verification", "Verification inputs are pending."),
  new ReadOnlyScaffoldAgent("editor-publisher", "Publishing is disabled."),
  new ReadOnlyScaffoldAgent("commerce", "Commerce is disabled."),
];

function overallStatus(results: AgentRunResult[]): RunStatus {
  if (results.some((item) => item.status === "failed")) return "failed";
  if (results.some((item) => item.status === "quarantined")) return "quarantined";
  if (results.every((item) => item.status === "completed")) return "completed";
  return "partial";
}

function sections(results: AgentRunResult[]): ReportSection[] {
  const definitions = [
    ["executive-summary", "Executive Summary", ["verification", "editor-publisher"]],
    ["etf-flows", "ETF Flows", ["etf-flow"]],
    ["treasuries", "Treasuries and Sovereigns", ["treasury-ledger", "policy-sovereign"]],
    ["networks", "BTC, LTC, and XLM Networks", ["network-intelligence"]],
    ["morpho", "Morpho Markets", ["morpho-risk"]],
  ] as const;

  return definitions.map(([id, title, names]) => {
    const related = results.filter((item) =>
      (names as readonly string[]).includes(item.agent),
    );
    return {
      id,
      title,
      status: overallStatus(related),
      claims: related.flatMap((item) => item.claims),
      warnings: related.flatMap((item) => item.warnings),
    };
  });
}

export async function runDailyReport(dryRun = true): Promise<DailyReportRun> {
  const startedAt = timestamp();
  const reportDate = newYorkDate();
  const context: AgentContext = {
    runId: `ssi-${reportDate}-${crypto.randomUUID().slice(0, 8)}`,
    reportDate,
    cutoffAt: startedAt,
    dryRun,
  };

  const agentResults: AgentRunResult[] = [];
  for (const agent of agents) {
    try {
      agentResults.push(await agent.execute(context));
    } catch (error) {
      agentResults.push({
        agent: agent.name,
        status: "failed",
        startedAt,
        completedAt: timestamp(),
        observations: [],
        claims: [],
        warnings: [],
        error: error instanceof Error ? error.message : "Unknown failure",
      });
    }
  }

  const allClaims = agentResults.flatMap((item) => item.claims);
  const reasons = [
    ...(dryRun ? ["Dry-run reports are not publishable."] : []),
    ...(allClaims.length === 0 ? ["No verified claims were generated."] : []),
  ];

  return {
    runId: context.runId,
    reportDate,
    timezone: TIMEZONE,
    methodologyVersion: METHODOLOGY_VERSION,
    status: overallStatus(agentResults),
    startedAt,
    completedAt: timestamp(),
    agentResults,
    sections: sections(agentResults),
    publicationGate: {
      passed: reasons.length === 0,
      reasons,
    },
  };
}
