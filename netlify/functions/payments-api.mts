import type { Config, Context } from "@netlify/functions";
import { getServiceSupabase, getSiteUrl, json, error, normalizeEmail, auditLog } from "./_shared/supabase.mts";
import {
  createActivationToken,
  hashToken,
  parseStripeEvent,
  processNormalizedPayment,
  verifyStripeSignature,
} from "./_shared/payments.mts";
import {
  SLEEP_PRODUCT_KEY,
  SLEEP_CONFIGURATION_VERSION,
  isAllowedFunnelProductKey,
  isValidStripeSessionId,
  maskEmail,
  normalizeProductKey,
  productKeyToCourseSlug,
  readSleepPriceEnvFromProcess,
  resolveSleepStripePriceId,
} from "./_shared/sleepProduct.mts";

/**
 * Checkout + post-purchase + Stripe webhook for metod-butzin-14.
 * - POST|GET /api/checkout
 * - GET      /api/post-purchase?session_id=
 * - POST     /api/webhooks/stripe
 */
export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const method = req.method.toUpperCase();

  try {
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if ((method === "GET" || method === "POST") && path === "checkout") {
      return await createCheckout(req, url);
    }

    if (method === "GET" && path === "post-purchase") {
      return await postPurchase(url, req);
    }

    if (method === "POST" && path === "webhooks/stripe") {
      return await handleStripeWebhook(req);
    }

    if (method === "GET" && path === "health") {
      return json({ ok: true, service: "payments-api" });
    }

    return error("Not found", 404);
  } catch (err) {
    console.error("[payments-api]", err instanceof Error ? err.message : err);
    return error("Server error", 500);
  }
};

export const config: Config = {
  path: ["/api/checkout", "/api/post-purchase", "/api/webhooks/stripe", "/api/health"],
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.SITE_URL || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function buildButzinCheckoutUrls(siteUrl: string) {
  const base = siteUrl.replace(/\/$/, "");
  return {
    successUrl: `${base}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}/?checkout=cancel`,
  };
}

async function handleStripeWebhook(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!verifyStripeSignature(payload, signature, secret)) {
    return error("Invalid signature", 400);
  }

  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return error("Invalid JSON", 400);
  }

  const normalized = parseStripeEvent(event);
  if (!normalized) {
    return json({ received: true, ignored: true });
  }

  const sb = getServiceSupabase();
  const siteUrl = getSiteUrl(req);
  const result = await processNormalizedPayment(sb, normalized, siteUrl);

  const { token: _t, activationUrl: _u, ...safe } = result as Record<string, unknown>;
  return json({ received: true, ...safe });
}

async function createCheckout(req: Request, url: URL) {
  const secret = process.env.STRIPE_SECRET_KEY || "";
  if (!secret) {
    return error(
      "Stripe не е конфигуриран. Задай STRIPE_SECRET_KEY в Netlify environment variables.",
      503,
    );
  }

  let productKey = url.searchParams.get("productKey") || url.searchParams.get("product_key") || "";
  let email = url.searchParams.get("email") || "";

  if (req.method.toUpperCase() === "POST") {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const forbidden = [
      "amount",
      "price",
      "priceId",
      "price_id",
      "currency",
      "successUrl",
      "cancelUrl",
      "success_url",
      "cancel_url",
    ];
    for (const key of forbidden) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
        return error("Невалидна заявка: цената и redirect URL се определят само от сървъра.", 400);
      }
    }
    productKey = String(body.productKey || body.product_key || productKey || "");
    email = String(body.email || email || "");
  }

  productKey = normalizeProductKey(productKey) || SLEEP_PRODUCT_KEY;

  if (!isAllowedFunnelProductKey(productKey)) {
    return error("Непознат или неактивен продукт.", 400);
  }

  const courseSlug = productKeyToCourseSlug(productKey);
  if (!courseSlug) return error("Непознат или неактивен продукт.", 400);

  const sb = getServiceSupabase();
  const { data: course } = await sb
    .from("courses")
    .select("id, slug, title")
    .eq("slug", courseSlug)
    .maybeSingle();

  if (!course) {
    return error("Продуктът sleep-restart-14 още не е конфигуриран в базата.", 404);
  }

  const { data: product } = await sb
    .from("course_products")
    .select("*")
    .eq("course_id", course.id)
    .eq("provider", "stripe")
    .eq("is_active", true)
    .maybeSingle();

  let priceId = product?.price_id || "";
  let priceTier: string | undefined;

  if (!priceId || priceId.startsWith("STRIPE_PRICE_ID")) {
    const resolved = resolveSleepStripePriceId(Date.now(), readSleepPriceEnvFromProcess());
    if (!resolved.ok) return error(resolved.error, 400);
    priceId = resolved.priceId;
    priceTier = resolved.tier;
  } else {
    const tierProbe = resolveSleepStripePriceId(Date.now(), readSleepPriceEnvFromProcess());
    priceTier = tierProbe.ok ? tierProbe.tier : "standard";
  }

  if (!priceId || priceId.startsWith("STRIPE_PRICE_ID")) {
    return error("Липсва валиден Stripe Price ID за този продукт", 400);
  }

  const siteUrl = getSiteUrl(req);
  const { successUrl, cancelUrl } = buildButzinCheckoutUrls(siteUrl);

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[price_id]", priceId);
  params.set("metadata[course_slug]", course.slug);
  params.set("metadata[product_id]", course.slug);
  params.set("metadata[product_key]", SLEEP_PRODUCT_KEY);
  params.set("metadata[entitlement_key]", course.slug);
  params.set("metadata[configuration_version]", String(SLEEP_CONFIGURATION_VERSION));
  if (priceTier) params.set("metadata[price_tier]", priceTier);
  params.set("client_reference_id", course.slug);
  if (email) {
    params.set("customer_email", normalizeEmail(email));
  }

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const session = (await stripeRes.json().catch(() => ({}))) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!stripeRes.ok || !session.url) {
    return error(session.error?.message || "Stripe Checkout не можа да се създаде", 502);
  }

  if (req.method.toUpperCase() === "GET") {
    return Response.redirect(session.url, 302);
  }
  return json({ url: session.url, id: session.id });
}

async function postPurchase(url: URL, req: Request) {
  const sessionId = url.searchParams.get("session_id") || "";
  const compact = url.searchParams.get("compact") === "1" || url.searchParams.get("funnel") === "1";

  if (!sessionId || sessionId.length < 10) {
    return error("Липсва session_id", 400);
  }
  if (!isValidStripeSessionId(sessionId)) {
    return error("Невалиден session_id", 400);
  }

  const secret = process.env.STRIPE_SECRET_KEY || "";
  if (!secret) return error("Stripe не е конфигуриран", 503);

  const stripeRes = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const session = (await stripeRes.json().catch(() => ({}))) as {
    id?: string;
    payment_status?: string;
    status?: string;
    customer_email?: string | null;
    customer_details?: { email?: string | null };
    metadata?: { course_slug?: string; product_id?: string; product_key?: string };
    client_reference_id?: string | null;
    error?: { message?: string };
  };

  if (!stripeRes.ok || !session.id) {
    return error(session.error?.message || "Stripe session не е намерена", 404);
  }

  if (session.status === "expired" || session.status === "open") {
    return json({
      ok: false,
      status: session.status === "expired" ? "canceled" : "checking",
      message:
        session.status === "expired" ? "Сесията е изтекла или отказана." : "Плащането още не е завършено.",
    });
  }

  if (
    session.payment_status &&
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return json({
      ok: false,
      status: "checking",
      message: "Плащането все още не е завършено.",
    });
  }

  const email = normalizeEmail(session.customer_details?.email || session.customer_email || "");
  if (!email) return error("Липсва имейл в Stripe сесията", 400);

  let courseSlug = String(
    session.metadata?.course_slug ||
      session.metadata?.product_key ||
      session.metadata?.product_id ||
      session.client_reference_id ||
      "",
  )
    .trim()
    .toLowerCase();
  if (courseSlug === "sleep" || courseSlug === "sleep-restart") courseSlug = SLEEP_PRODUCT_KEY;

  const sb = getServiceSupabase();
  const siteUrl = getSiteUrl(req);
  const emailOut = compact ? maskEmail(email) : email;
  const appLogin = `${siteUrl}/app/login`;
  const appHome = `${siteUrl}/app/`;
  const appSignup = `${siteUrl}/app/signup`;

  const { data: profile } = await sb.from("profiles").select("id").eq("email", email).maybeSingle();

  if (profile) {
    return json({
      ok: true,
      status: "access_granted",
      alreadyHasAccount: true,
      email: emailOut,
      courseSlug: courseSlug || null,
      loginUrl: appLogin,
      classroomUrl: appHome,
    });
  }

  type GrantRow = {
    id: string;
    course_id: string;
    status: string;
    courses?: { slug?: string } | { slug?: string }[] | null;
  };
  let accessGrant: GrantRow | null = null;

  if (courseSlug) {
    const { data: course } = await sb.from("courses").select("id").eq("slug", courseSlug).maybeSingle();
    if (course?.id) {
      const { data: byCourse } = await sb
        .from("access_grants")
        .select("id, course_id, status, courses(slug)")
        .ilike("email", email)
        .eq("course_id", course.id)
        .in("status", ["pending", "active"])
        .maybeSingle();
      accessGrant = (byCourse as GrantRow) || null;
    }
  }

  if (!accessGrant) {
    const { data: latest } = await sb
      .from("access_grants")
      .select("id, course_id, status, courses(slug)")
      .ilike("email", email)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    accessGrant = (latest as GrantRow) || null;
  }

  if (!accessGrant) {
    return json({
      ok: true,
      status: "preparing_access",
      pending: true,
      email: emailOut,
      courseSlug: courseSlug || null,
      message: "Плащането е потвърдено. Достъпът се подготвя…",
    });
  }

  const rawToken = createActivationToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString();

  await sb
    .from("activation_tokens")
    .update({ used_at: new Date().toISOString() })
    .ilike("email", email)
    .is("used_at", null);

  await sb.from("activation_tokens").insert({
    email,
    token_hash: tokenHash,
    access_grant_id: accessGrant.id,
    expires_at: expiresAt,
  });

  await auditLog(sb, "activation.token_created_post_purchase", {
    email,
    session_id: sessionId,
  });

  return json({
    ok: true,
    status: "access_granted",
    alreadyHasAccount: false,
    email: emailOut,
    courseSlug: courseSlug || null,
    activationUrl: appSignup,
    loginUrl: appLogin,
    classroomUrl: appHome,
    message: "Създай профил в Somniora с имейла от поръчката, за да получиш достъп.",
  });
}
