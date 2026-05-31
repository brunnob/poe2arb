import { NextResponse } from "next/server";
import { CURRENCIES } from "@/lib/currencies";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ currencies: CURRENCIES });
}
