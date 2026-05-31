import { NextRequest, NextResponse } from "next/server";
import { computeSpread } from "@/lib/arbitrage";
import { isKnownCurrency } from "@/lib/currencies";
import { TradeApiError } from "@/lib/poe";
import { ListingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUS: ListingStatus[] = ["online", "onlineleague", "any"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const base = sp.get("base") ?? "";
  const quote = sp.get("quote") ?? "";
  const league = sp.get("league") || process.env.POE2_LEAGUE || "Standard";
  const statusParam = sp.get("status") ?? "online";
  const includeAfk = sp.get("includeAfk") === "1";
  const minimumParam = sp.get("minimum");

  if (!base || !quote) {
    return NextResponse.json({ error: "base and quote are required" }, { status: 400 });
  }
  if (base === quote) {
    return NextResponse.json({ error: "base and quote must differ" }, { status: 400 });
  }
  if (!isKnownCurrency(base) || !isKnownCurrency(quote)) {
    return NextResponse.json({ error: "unknown currency tag" }, { status: 400 });
  }
  const status = (VALID_STATUS as string[]).includes(statusParam)
    ? (statusParam as ListingStatus)
    : "online";
  const minimum = minimumParam ? Math.max(1, parseInt(minimumParam, 10) || 1) : undefined;

  try {
    const result = await computeSpread({
      league,
      base,
      quote,
      status,
      includeAfk,
      minimum,
    });
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
