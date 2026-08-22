/**
 * Payment provider adapter + Stripe webhook processing
 * Idempotent via provider_event_id / transaction_id
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { auditLog, normalizeEmail } from "./supabase.mts";

export type PaymentProvider = "stripe";

export interface NormalizedPayment {
  provider: PaymentProvider;
  providerEventId: string;
  eventType: string;
  transactionId: string | null;
  orderId: string | null;
  productId: string | null;
  priceId: string | null;
  customerEmail: string;
  amountCents: number | null;
  currency: string;
  status: "succeeded" | "refunded" | "disputed" | "failed" | "subscription_updated" | "subscription_deleted";
  paidThrough?: string | null;
  raw: unknown;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createActivationToken() {
  return randomBytes(32).toString("base64url");
}

export function verifyStripeSignature(payload: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader || !secret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v];
    }),
  );
  const timestamp = parts.t;
  const sig = parts.v1;
  if (!timestamp || !sig) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 60 * 5) return false;
  const signed = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed, "utf8").digest("hex");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseStripeEvent(event: any): NormalizedPayment | null {
  const type = String(event?.type || "");
  const obj = event?.data?.object || {};

  if (type === "checkout.session.completed") {
    const email = normalizeEmail(obj.customer_details?.email || obj.customer_email || "");
    if (!email) return null;
    return {
      provider: "stripe",
      providerEventId: event.id,
      eventType: type,
      transactionId: obj.payment_intent || obj.id,
      orderId: obj.id,
      productId: obj.metadata?.product_id || obj.metadata?.course_slug || null,
      priceId: obj.metadata?.price_id || null,
      customerEmail: email,
      amountCents: typeof obj.amount_total === "number" ? obj.amount_total : null,
      currency: (obj.currency || "eur").toLowerCase(),
      status: "succeeded",
      raw: event,
    };
  }

  if (type === "payment_intent.succeeded") {
    const email = normalizeEmail(obj.receipt_email || obj.charges?.data?.[0]?.billing_details?.email || "");
    if (!email) return null;
    return {
      provider: "stripe",
      providerEventId: event.id,
      eventType: type,
      transactionId: obj.id,
      orderId: obj.id,
      productId: obj.metadata?.product_id || null,
      priceId: obj.metadata?.price_id || null,
      customerEmail: email,
      amountCents: typeof obj.amount === "number" ? obj.amount : null,
      currency: (obj.currency || "eur").toLowerCase(),
      status: "succeeded",
      raw: event,
    };
  }

  if (type === "invoice.paid") {
    const email = normalizeEmail(obj.customer_email || "");
    if (!email) return null;
    const line = obj.lines?.data?.[0];
    return {
      provider: "stripe",
      providerEventId: event.id,
      eventType: type,
      transactionId: obj.payment_intent || obj.id,
      orderId: obj.id,
      productId: obj.metadata?.product_id || line?.price?.product || null,
      priceId: line?.price?.id || obj.metadata?.price_id || null,
      customerEmail: email,
      amountCents: typeof obj.amount_paid === "number" ? obj.amount_paid : null,
      currency: (obj.currency || "eur").toLowerCase(),
      status: "succeeded",
      paidThrough: obj.lines?.data?.[0]?.period?.end
        ? new Date(obj.lines.data[0].period.end * 1000).toISOString()
        : null,
      raw: event,
    };
  }

  if (type === "charge.refunded") {
    const email = normalizeEmail(obj.billing_details?.email || obj.receipt_email || "");
    return {
      provider: "stripe",
      providerEventId: event.id,
      eventType: type,
      transactionId: obj.payment_intent || obj.id,
      orderId: obj.id,
      productId: obj.metadata?.product_id || null,
      priceId: obj.metadata?.price_id || null,
      customerEmail: email || "unknown@refund.local",
      amountCents: typeof obj.amount_refunded === "number" ? obj.amount_refunded : null,
      currency: (obj.currency || "eur").toLowerCase(),
      status: "refunded",
      raw: event,
    };
  }

  if (type === "charge.dispute.created" || type === "radar.early_fraud_warning.created") {
    return {
      provider: "stripe",
      providerEventId: event.id,
      eventType: type,
      transactionId: obj.payment_intent || obj.charge || obj.id,
      orderId: obj.id,
      productId: obj.metadata?.product_id || null,
      priceId: null,
      customerEmail: normalizeEmail(obj.evidence?.customer_email_address || "") || "unknown@dispute.local",
      amountCents: typeof obj.amount === "number" ? obj.amount : null,
      currency: (obj.currency || "eur").toLowerCase(),
      status: "disputed",
      raw: event,
    };
  }

  if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    const email = normalizeEmail(obj.customer_email || obj.metadata?.email || "");
    return {
      provider: "stripe",
      providerEventId: event.id,
      eventType: type,
      transactionId: obj.id,
      orderId: obj.id,
      productId: obj.metadata?.product_id || null,
      priceId: obj.items?.data?.[0]?.price?.id || null,
      customerEmail: email || "unknown@subscription.local",
      amountCents: null,
      currency: "eur",
      status: type.endsWith("deleted") ? "subscription_deleted" : "subscription_updated",
      paidThrough: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null,
      raw: event,
    };
  }

  return null;
}

async function resolveCourseId(sb: SupabaseClient, payment: NormalizedPayment) {
  if (payment.priceId) {
    const { data } = await sb
      .from("course_products")
      .select("course_id")
      .eq("provider", payment.provider)
      .eq("price_id", payment.priceId)
      .eq("is_active", true)
      .maybeSingle();
    if (data?.course_id) return data.course_id as string;
  }

  // Env mapping fallbacks
  const basicsPrice = process.env.STRIPE_PRICE_ID_AI_BASICS;
  const devPrice = process.env.STRIPE_PRICE_ID_AI_DEVELOPMENT;
  const sleepLaunchPrice = process.env.STRIPE_PRICE_ID_SLEEP_RESTART_LAUNCH;
  const sleepStandardPrice = process.env.STRIPE_PRICE_ID_SLEEP_RESTART_STANDARD;
  let slug: string | null = payment.productId;
  if (payment.priceId && basicsPrice && payment.priceId === basicsPrice) slug = "ai-basics";
  if (payment.priceId && devPrice && payment.priceId === devPrice) slug = "ai-development";
  if (
    payment.priceId &&
    ((sleepLaunchPrice && payment.priceId === sleepLaunchPrice) ||
      (sleepStandardPrice && payment.priceId === sleepStandardPrice))
  ) {
    slug = "sleep-restart-14";
  }
  if (slug === "basics") slug = "ai-basics";
  if (slug === "dev") slug = "ai-development";
  if (slug === "sleep" || slug === "sleep-restart") slug = "sleep-restart-14";

  if (slug) {
    const { data } = await sb.from("courses").select("id").eq("slug", slug).maybeSingle();
    if (data?.id) return data.id as string;
  }
  return null;
}

async function courseIdBySlug(sb: SupabaseClient, slug: string) {
  const { data } = await sb.from("courses").select("id").eq("slug", slug).maybeSingle();
  return (data?.id as string) || null;
}

/** Create/update access_grant (+ enrollment if user exists). Returns the grant row. */
export async function ensureCourseAccess(
  sb: SupabaseClient,
  opts: {
    email: string;
    courseId: string;
    userId?: string | null;
    paymentTransactionId?: string | null;
    paidThrough?: string | null;
  },
) {
  const email = normalizeEmail(opts.email);
  const status = opts.userId ? "active" : "pending";

  const { data: existingGrant } = await sb
    .from("access_grants")
    .select("*")
    .ilike("email", email)
    .eq("course_id", opts.courseId)
    .in("status", ["pending", "active"])
    .maybeSingle();

  let accessGrant = existingGrant;
  if (existingGrant) {
    await sb
      .from("access_grants")
      .update({
        payment_transaction_id: opts.paymentTransactionId || existingGrant.payment_transaction_id,
        status: opts.userId ? "active" : existingGrant.status,
        user_id: opts.userId || existingGrant.user_id,
        ends_at: opts.paidThrough || existingGrant.ends_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingGrant.id);
    const { data: refreshed } = await sb.from("access_grants").select("*").eq("id", existingGrant.id).single();
    accessGrant = refreshed || existingGrant;
  } else {
    const { data: created, error: cErr } = await sb
      .from("access_grants")
      .insert({
        email,
        user_id: opts.userId || null,
        course_id: opts.courseId,
        payment_transaction_id: opts.paymentTransactionId || null,
        status,
        source: "payment",
        starts_at: new Date().toISOString(),
        ends_at: opts.paidThrough || null,
      })
      .select("*")
      .single();
    if (cErr) throw cErr;
    accessGrant = created;
  }

  if (opts.userId && accessGrant) {
    await sb.from("enrollments").upsert(
      {
        user_id: opts.userId,
        course_id: opts.courseId,
        access_grant_id: accessGrant.id,
        status: "active",
        expires_at: opts.paidThrough || null,
      },
      { onConflict: "user_id,course_id" },
    );
  }

  return accessGrant;
}

/** AI Development purchase also unlocks AI Basics. */
async function grantBundledCourses(
  sb: SupabaseClient,
  opts: {
    purchasedCourseId: string;
    email: string;
    userId?: string | null;
    paymentTransactionId: string;
    paidThrough?: string | null;
  },
) {
  const { data: purchased } = await sb
    .from("courses")
    .select("id, slug")
    .eq("id", opts.purchasedCourseId)
    .maybeSingle();

  const primary = await ensureCourseAccess(sb, {
    email: opts.email,
    courseId: opts.purchasedCourseId,
    userId: opts.userId,
    paymentTransactionId: opts.paymentTransactionId,
    paidThrough: opts.paidThrough,
  });

  if (purchased?.slug === "ai-development") {
    const basicsId = await courseIdBySlug(sb, "ai-basics");
    if (basicsId && basicsId !== opts.purchasedCourseId) {
      await ensureCourseAccess(sb, {
        email: opts.email,
        courseId: basicsId,
        userId: opts.userId,
        paymentTransactionId: opts.paymentTransactionId,
        paidThrough: opts.paidThrough,
      });
    }
  }

  return primary;
}

export async function processNormalizedPayment(sb: SupabaseClient, payment: NormalizedPayment, siteUrl: string) {
  // Idempotency: webhook_events
  const { error: whErr } = await sb.from("webhook_events").insert({
    provider: payment.provider,
    event_id: payment.providerEventId,
    event_type: payment.eventType,
    signature_valid: true,
    status: "processing",
    payload: payment.raw as object,
  });
  if (whErr) {
    if (whErr.code === "23505") {
      return { ok: true, duplicate: true };
    }
    throw whErr;
  }

  await sb.from("payment_events").upsert(
    {
      provider: payment.provider,
      event_type: payment.eventType,
      provider_event_id: payment.providerEventId,
      payload: payment.raw as object,
      processed: false,
    },
    { onConflict: "provider,provider_event_id" },
  );

  if (payment.status === "succeeded") {
    const courseId = await resolveCourseId(sb, payment);
    if (!courseId) {
      await sb.from("webhook_events").update({ status: "error", error: "course_not_resolved" }).eq("event_id", payment.providerEventId);
      return { ok: false, error: "course_not_resolved" };
    }

    const email = normalizeEmail(payment.customerEmail);

    const { data: tx, error: txErr } = await sb
      .from("payment_transactions")
      .upsert(
        {
          provider: payment.provider,
          provider_event_id: payment.providerEventId,
          transaction_id: payment.transactionId,
          order_id: payment.orderId,
          product_id: payment.productId,
          price_id: payment.priceId,
          customer_email: email,
          course_id: courseId,
          amount_cents: payment.amountCents,
          currency: payment.currency,
          status: "succeeded",
          raw_payload: payment.raw as object,
          paid_at: new Date().toISOString(),
        },
        { onConflict: "provider,provider_event_id" },
      )
      .select("*")
      .single();

    if (txErr) throw txErr;

    // Existing profile?
    const { data: existingProfile } = await sb
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    const accessGrant = await grantBundledCourses(sb, {
      purchasedCourseId: courseId,
      email,
      userId: existingProfile?.id || null,
      paymentTransactionId: tx.id,
      paidThrough: payment.paidThrough || null,
    });

    if (existingProfile) {
      await auditLog(sb, "access.granted_existing_user", { email, course_id: courseId, entity_type: "course", entity_id: courseId }, existingProfile.id);
      await sb.from("webhook_events").update({ status: "processed" }).eq("event_id", payment.providerEventId);
      await sb.from("payment_events").update({ processed: true }).eq("provider_event_id", payment.providerEventId);
      return { ok: true, existingUser: true, email, courseId };
    }

    // Create one-time activation token
    const rawToken = createActivationToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(); // 72h

    await sb.from("activation_tokens").insert({
      email,
      token_hash: tokenHash,
      access_grant_id: accessGrant!.id,
      payment_transaction_id: tx.id,
      expires_at: expiresAt,
    });

    await auditLog(sb, "activation.token_created", { email, course_id: courseId, entity_type: "access_grant", entity_id: accessGrant!.id });
    await sb.from("webhook_events").update({ status: "processed" }).eq("event_id", payment.providerEventId);
    await sb.from("payment_events").update({ processed: true }).eq("provider_event_id", payment.providerEventId);

    return {
      ok: true,
      existingUser: false,
      email,
      courseId,
      activationUrl: `${siteUrl}/academy/activate-account?token=${rawToken}`,
      token: rawToken,
    };
  }

  if (payment.status === "refunded") {
    if (payment.transactionId) {
      await sb
        .from("payment_transactions")
        .update({ status: "refunded", refunded_at: new Date().toISOString() })
        .eq("transaction_id", payment.transactionId);

      const { data: txs } = await sb
        .from("payment_transactions")
        .select("id, course_id, customer_email")
        .eq("transaction_id", payment.transactionId);

      for (const t of txs || []) {
        await sb
          .from("access_grants")
          .update({ status: "revoked", revoked_at: new Date().toISOString(), revoke_reason: "refund" })
          .eq("payment_transaction_id", t.id);

        const { data: profiles } = await sb.from("profiles").select("id").ilike("email", t.customer_email);
        for (const p of profiles || []) {
          if (t.course_id) {
            await sb
              .from("enrollments")
              .update({ status: "revoked" })
              .eq("user_id", p.id)
              .eq("course_id", t.course_id);
          }
        }
      }
    }
    await auditLog(sb, "payment.refunded", { transaction_id: payment.transactionId });
    await sb.from("webhook_events").update({ status: "processed" }).eq("event_id", payment.providerEventId);
    return { ok: true, refunded: true };
  }

  if (payment.status === "disputed") {
    if (payment.transactionId) {
      const { data: txs } = await sb
        .from("payment_transactions")
        .select("id, course_id, customer_email")
        .eq("transaction_id", payment.transactionId);
      await sb
        .from("payment_transactions")
        .update({ status: "disputed", disputed_at: new Date().toISOString() })
        .eq("transaction_id", payment.transactionId);

      for (const t of txs || []) {
        await sb
          .from("access_grants")
          .update({ status: "suspended", revoke_reason: "chargeback" })
          .eq("payment_transaction_id", t.id);
        const { data: profiles } = await sb.from("profiles").select("id").ilike("email", t.customer_email);
        for (const p of profiles || []) {
          await sb.from("profiles").update({ is_suspended: true, suspended_reason: "chargeback" }).eq("id", p.id);
          if (t.course_id) {
            await sb.from("enrollments").update({ status: "suspended" }).eq("user_id", p.id).eq("course_id", t.course_id);
          }
        }
      }
    }
    await auditLog(sb, "payment.disputed", { transaction_id: payment.transactionId, notify_admin: true });
    await sb.from("webhook_events").update({ status: "processed" }).eq("event_id", payment.providerEventId);
    return { ok: true, disputed: true };
  }

  if (payment.status === "subscription_deleted" || payment.status === "subscription_updated") {
    // Keep access until paid_through
    if (payment.paidThrough && payment.customerEmail) {
      await sb
        .from("access_grants")
        .update({ ends_at: payment.paidThrough })
        .ilike("email", payment.customerEmail)
        .eq("status", "active");
    }
    if (payment.status === "subscription_deleted" && payment.paidThrough) {
      // schedule expiry handled by ends_at checks
    }
    await sb.from("webhook_events").update({ status: "processed" }).eq("event_id", payment.providerEventId);
    return { ok: true };
  }

  await sb.from("webhook_events").update({ status: "ignored" }).eq("event_id", payment.providerEventId);
  return { ok: true, ignored: true };
}
