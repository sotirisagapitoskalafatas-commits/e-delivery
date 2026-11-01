import { NextResponse } from "next/server";

export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  return NextResponse.json(
    { status: configured ? "ready_for_auth_check" : "configuration_required" },
    { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
