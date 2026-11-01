import { NextRequest, NextResponse } from "next/server";
import { runDailyReport } from "../../../../lib/agents/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function newYorkHour(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Vercel cron schedules use UTC. The job is invoked at both 12:00 and
  // 13:00 UTC; only the invocation that lands at 08:00 New York time runs.
  if (newYorkHour() !== "08") {
    return NextResponse.json({
      status: "skipped",
      reason: "Not 08:00 in America/New_York.",
    });
  }

  const report = await runDailyReport(false);

  return NextResponse.json(report, {
    status: report.status === "failed" ? 500 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
