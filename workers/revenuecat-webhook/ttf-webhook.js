// TracetoForge RevenueCat Webhook Worker
// Updated Jul 2026: 20 credits for $9.99, 100 credits for $34.99 (matches PaywallModal + landing pricing)
// Updated Nov 2026: ttf_unlimited ($2.99 one time) turns on profiles.unlimited inside
// fulfill_purchase; the credit value here only has to be > 0 so the event is fulfilled.

const UNLIMITED_PRODUCT = "ttf_unlimited";

const PRODUCT_CREDITS = {
  "ttf_5_credits": 20,
  "ttf_20_credits": 100,
  "ttf_credits_5": 20,
  "ttf_credits_20": 100,
  "ttf_5_exports": 20,
  "ttf_20_exports": 100,
  [UNLIMITED_PRODUCT]: 1,
};

function getCreditsForProduct(productId) {
  if (!productId) return 0;
  if (PRODUCT_CREDITS[productId]) return PRODUCT_CREDITS[productId];
  if (productId.includes("unlimited")) return 0;
  if (productId.includes("20")) return 100;
  if (productId.includes("5")) return 20;
  return 0;
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    // Verify webhook secret
    const authHeader = request.headers.get("Authorization");
    if (env.RC_WEBHOOK_SECRET && authHeader !== `Bearer ${env.RC_WEBHOOK_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const event = body.event || body;
    const eventType = event.type || body.type || "unknown";
    const appUserId = event.app_user_id || body.app_user_id || "";
    const productId = event.product_id || body.product_id || "";
    // Use RevenueCat's actual event ID for deduplication
    const rcEventId = event.id || body.id || `${eventType}_${appUserId}_${Date.now()}`;

    console.log(`[webhook] type=${eventType} user=${appUserId} product=${productId} rcId=${rcEventId}`);

    // Handle TEST events
    if (eventType === "TEST") {
      return new Response(JSON.stringify({ ok: true, action: "test_received" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const purchaseEvents = [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "NON_RENEWING_PURCHASE",
      "PRODUCT_CHANGE",
    ];
    const refundEvents = ["CANCELLATION", "REFUND"];

    let creditsGranted = 0;
    let action = "ignored";

    if (purchaseEvents.includes(eventType)) {
      creditsGranted = getCreditsForProduct(productId);
      if (creditsGranted > 0 && appUserId) {
        // Call fulfill_purchase with RC event ID for dedup
        const rpcRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/fulfill_purchase`, {
          method: "POST",
          headers: {
            apikey: env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_app_user_id: appUserId,
            p_product_id: productId,
            p_credits: creditsGranted,
            p_event_id: rcEventId,
            p_event_type: eventType,
            p_payload: body,
          }),
        });

        if (rpcRes.ok) {
          const result = await rpcRes.json();
          if (result.duplicate) {
            action = "already_processed";
            console.log(`[webhook] Duplicate event ${rcEventId}, skipping`);
          } else if (result.success === false) {
            action = "failed";
            console.error(`[webhook] fulfill_purchase failed: ${result.error}`);
            // Log the failed event for manual review
            await logEvent(env, rcEventId, eventType, appUserId, productId, 0, body);
          } else if (result.unlimited) {
            action = "unlimited_enabled";
            console.log(`[webhook] Unlimited exports enabled for ${appUserId}`);
          } else {
            action = "credits_added";
            console.log(`[webhook] Added ${creditsGranted} credits to ${appUserId}`);
          }
        } else {
          const errText = await rpcRes.text();
          console.error(`[webhook] RPC error: ${errText}`);
          action = "failed";
          // Log failed event - do NOT fall back to add_credits (bypasses dedup)
          await logEvent(env, `FAILED_${rcEventId}`, eventType, appUserId, productId, 0, body);
        }
      }
    } else if (refundEvents.includes(eventType)) {
      creditsGranted = -getCreditsForProduct(productId);
      if (creditsGranted < 0 && appUserId) {
        const rpcRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/handle_refund`, {
          method: "POST",
          headers: {
            apikey: env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_event_id: rcEventId,
            p_app_user_id: appUserId,
            p_product_id: productId,
            p_credits: Math.abs(creditsGranted),
            p_payload: body,
          }),
        });

        if (rpcRes.ok) {
          const result = await rpcRes.json();
          if (result.duplicate) {
            action = "already_processed";
          } else {
            action = result.success ? "credits_removed" : "refund_failed";
          }
        } else {
          action = "refund_failed";
          console.error(`[webhook] Refund RPC error: ${await rpcRes.text()}`);
          await logEvent(env, `FAILED_REFUND_${rcEventId}`, eventType, appUserId, productId, 0, body);
        }
      }
    } else {
      // Log non-purchase/refund events for monitoring
      await logEvent(env, rcEventId, eventType, appUserId, productId, 0, body);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        action,
        credits_granted: creditsGranted,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};

async function logEvent(env, eventId, eventType, appUserId, productId, credits, payload) {
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/webhook_events`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id: eventId,
        event_type: eventType,
        app_user_id: appUserId,
        product_id: productId,
        credits_granted: credits,
        raw_payload: payload,
      }),
    });
  } catch (err) {
    console.error(`[webhook] Failed to log event: ${err.message}`);
  }
}
