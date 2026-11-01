import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ApplicationPayload = {
  application_type?: "merchant" | "courier";
  first_name?: string; last_name?: string; email?: string; phone?: string; city?: string;
  business_name?: string | null; business_type?: string | null; address_line?: string | null; postal_code?: string | null;
  fulfillment_interests?: string[]; vehicle_type?: string | null; courier_network_preference?: string | null;
  age_confirmed?: boolean; has_valid_driver_license?: boolean; has_smartphone?: boolean;
  privacy_notice_acknowledged?: boolean; website?: string; turnstile_token?: string;
};

export async function POST(request: Request) {
  const siteverifySecret = process.env.TURNSTILE_SECRET_KEY;
  if (process.env.PARTNER_APPLICATIONS_ENABLED !== "true") {
    return NextResponse.json({ success: false, error: "applications_not_open" }, { status: 503 });
  }
  if (!siteverifySecret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    return NextResponse.json({ success: false, error: "turnstile_not_configured" }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ success: false, error: "invalid_origin" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 20_000) {
    return NextResponse.json({ success: false, error: "request_too_large" }, { status: 413 });
  }

  let payload: ApplicationPayload;
  try {
    payload = await request.json() as ApplicationPayload;
  } catch {
    return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  }

  const token = String(payload.turnstile_token ?? "");
  if (token.length < 10 || token.length > 4096) {
    return NextResponse.json({ success: false, error: "verification_required" }, { status: 400 });
  }

  const verification = new FormData();
  verification.set("secret", siteverifySecret);
  verification.set("response", token);
  const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: verification,
    cache: "no-store"
  }).catch(() => null);

  if (!verifyResponse?.ok) {
    return NextResponse.json({ success: false, error: "verification_unavailable" }, { status: 503 });
  }
  const verificationResult = await verifyResponse.json() as { success?: boolean };
  if (!verificationResult.success) {
    return NextResponse.json({ success: false, error: "verification_failed" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "database_not_configured" }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("submit_partner_application", {
    p_application_type: payload.application_type,
    p_first_name: payload.first_name,
    p_last_name: payload.last_name,
    p_email: payload.email,
    p_phone: payload.phone,
    p_city: payload.city,
    p_business_name: payload.business_name ?? null,
    p_business_type: payload.business_type ?? null,
    p_address_line: payload.address_line ?? null,
    p_postal_code: payload.postal_code ?? null,
    p_fulfillment_interests: payload.fulfillment_interests ?? [],
    p_vehicle_type: payload.vehicle_type ?? null,
    p_courier_network_preference: payload.courier_network_preference ?? null,
    p_age_confirmed: payload.age_confirmed ?? false,
    p_has_valid_driver_license: payload.has_valid_driver_license ?? false,
    p_has_smartphone: payload.has_smartphone ?? false,
    p_privacy_notice_acknowledged: payload.privacy_notice_acknowledged ?? false,
    p_website: payload.website ?? ""
  });

  if (error) {
    const message = error.message.includes("application_already_exists") ? "application_already_exists" : "application_not_saved";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ success: false, error: "application_not_saved" }, { status: 400 });
  }
  return NextResponse.json({ success: true, id: data }, { status: 201 });
}
