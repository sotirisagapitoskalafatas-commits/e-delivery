import "server-only";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20_000;
const TURNSTILE_ACTION = "partner_application";

type ApplicationPayload = {
  application_type?: "merchant" | "courier";
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  business_name?: string | null;
  business_type?: string | null;
  address_line?: string | null;
  postal_code?: string | null;
  fulfillment_interests?: string[];
  vehicle_type?: string | null;
  courier_network_preference?: string | null;
  age_confirmed?: boolean;
  has_valid_driver_license?: boolean;
  has_smartphone?: boolean;
  privacy_notice_acknowledged?: boolean;
  website?: string;
  turnstile_token?: string;
};

type TurnstileSiteverifyResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
};

async function readLimitedJson(request: Request): Promise<ApplicationPayload> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_request");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("request_too_large");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  for (const chunk of chunks) body += decoder.decode(chunk, { stream: true });
  body += decoder.decode();

  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("invalid_request");
  }
  return parsed as ApplicationPayload;
}

export async function POST(request: Request) {
  if (process.env.PARTNER_APPLICATIONS_ENABLED !== "true") {
    return NextResponse.json({ success: false, error: "applications_not_open" }, { status: 503 });
  }

  const siteverifySecret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const configuredHostnames = (process.env.PARTNER_APPLICATION_ALLOWED_HOSTNAMES ?? "")
    .split(/[,\s]+/)
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
  const allowedHostnames = new Set(configuredHostnames);

  if (!siteverifySecret || !siteKey || allowedHostnames.size === 0) {
    return NextResponse.json({ success: false, error: "turnstile_not_configured" }, { status: 503 });
  }

  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ success: false, error: "origin_required" }, { status: 403 });
  }

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return NextResponse.json({ success: false, error: "invalid_origin" }, { status: 403 });
  }

  const requestHostname = requestUrl.hostname.toLowerCase();
  if (
    originUrl.origin !== requestUrl.origin ||
    originUrl.hostname.toLowerCase() !== requestHostname ||
    !allowedHostnames.has(requestHostname)
  ) {
    return NextResponse.json({ success: false, error: "invalid_origin" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ success: false, error: "json_required" }, { status: 415 });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
    }
    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: "request_too_large" }, { status: 413 });
    }
  }

  let payload: ApplicationPayload;
  try {
    payload = await readLimitedJson(request);
  } catch (error) {
    if (error instanceof Error && error.message === "request_too_large") {
      return NextResponse.json({ success: false, error: "request_too_large" }, { status: 413 });
    }
    return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  }

  const token = typeof payload.turnstile_token === "string" ? payload.turnstile_token : "";
  if (token.length < 10 || token.length > 2048) {
    return NextResponse.json({ success: false, error: "verification_required" }, { status: 400 });
  }

  let verificationResult: TurnstileSiteverifyResponse;
  try {
    const verificationBody = new URLSearchParams({
      secret: siteverifySecret,
      response: token
    });
    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verificationBody,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });

    if (!verifyResponse.ok) {
      return NextResponse.json({ success: false, error: "verification_unavailable" }, { status: 503 });
    }
    verificationResult = await verifyResponse.json() as TurnstileSiteverifyResponse;
  } catch {
    return NextResponse.json({ success: false, error: "verification_unavailable" }, { status: 503 });
  }

  if (
    verificationResult.success !== true ||
    typeof verificationResult.hostname !== "string" ||
    verificationResult.hostname.toLowerCase() !== requestHostname ||
    !allowedHostnames.has(verificationResult.hostname.toLowerCase()) ||
    verificationResult.action !== TURNSTILE_ACTION
  ) {
    return NextResponse.json({ success: false, error: "verification_failed" }, { status: 400 });
  }

  // This privileged client is deliberately isolated to this server route. The public
  // browser key cannot execute submit_partner_application directly.
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json({ success: false, error: "database_not_configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  try {
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
      if (error.message.includes("application_already_exists")) {
        return NextResponse.json({ success: false, error: "application_already_exists" }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: "application_not_saved" }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ success: false, error: "application_not_saved" }, { status: 400 });
    }
    return NextResponse.json({ success: true, id: data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "database_unavailable" }, { status: 503 });
  }
}
