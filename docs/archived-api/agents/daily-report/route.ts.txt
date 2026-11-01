import { NextRequest, NextResponse } from "next/server";
import { runDailyReport } from "../../../../lib/agents/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const configuredSecret = process.env.REPORT_CRON_SECRET;
  if (!configuredSecret) return false;

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  return (
    authorization === `Bearer ${configuredSecret}` ||
    headerSecret === configuredSecret
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: "satnam-satoshi-intelligence",
    endpoint: "daily-report",
    status: "ready",
    mode: "read-only-scaffold",
    publicationEnabled: false,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.REPORT_CRON_SECRET) {
    return NextResponse.json(
      { error: "REPORT_CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;
  const report = await runDailyReport(dryRun);

  return NextResponse.json(report, {
    status: report.status === "failed" ? 500 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
