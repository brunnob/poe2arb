import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/search-run";
import { TradeApiError } from "@/lib/poe";
import { SearchBody } from "@/lib/search";

export const dynamic = "force-dynamic";

interface Payload {
  league?: string;
  query?: SearchBody;
  limit?: number;
}

export async function POST(req: NextRequest) {
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const league = payload.league || process.env.POE2_LEAGUE || "Standard";
  const body = payload.query;
  if (!body || typeof body !== "object" || !("query" in body) || !("sort" in body)) {
    return NextResponse.json(
      { error: "query must be a search body with `query` and `sort`" },
      { status: 400 },
    );
  }
  const limit = Math.min(100, Math.max(1, Number(payload.limit) || 20));

  try {
    const result = await runSearch(league, body, limit);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TradeApiError) {
      return NextResponse.json(
        { error: err.message, status: err.status, retryAfter: err.retryAfter },
        { status: err.status === 429 ? 429 : 502 },
      );
    }
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
