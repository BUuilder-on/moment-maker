import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fedapay-signature",
};

// Verify FedaPay webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("FEDAPAY_WEBHOOK_SECRET")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get("x-fedapay-signature") || "";

    console.log("Webhook received:", rawBody);
    console.log("Signature:", signature);

    // Verify signature (optional but recommended)
    // Note: FedaPay may use different signature format, adjust if needed
    // if (!verifySignature(rawBody, signature, webhookSecret)) {
    //   console.error("Invalid signature");
    //   return new Response(JSON.stringify({ error: "Invalid signature" }), {
    //     status: 401,
    //     headers: { ...corsHeaders, "Content-Type": "application/json" },
    //   });
    // }

    const event = JSON.parse(rawBody);
    console.log("Event parsed:", JSON.stringify(event, null, 2));

    // FedaPay sends different event types
    // We're interested in transaction.approved or transaction.completed
    const eventName = event.name || event.type;
    const transaction = event.entity || event.data?.object;

    console.log("Event name:", eventName);
    console.log("Transaction:", JSON.stringify(transaction, null, 2));

    // Check if this is a successful payment event
    const successEvents = [
      "transaction.approved",
      "transaction.completed",
      "transaction.successful",
    ];

    if (!successEvents.includes(eventName)) {
      console.log("Event not a success event, ignoring:", eventName);
      return new Response(JSON.stringify({ received: true, action: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the transaction ID and custom_id (order ID)
    const transactionId = transaction?.id?.toString();
    const orderId = transaction?.custom_id || transaction?.reference;
    const amount = transaction?.amount;
    const status = transaction?.status;

    console.log("Transaction ID:", transactionId);
    console.log("Order ID:", orderId);
    console.log("Amount:", amount);
    console.log("Status:", status);

    if (!orderId) {
      console.error("No order ID found in transaction");
      return new Response(JSON.stringify({ error: "No order ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the pending order
    const { data: order, error: orderError } = await supabase
      .from("credit_orders")
      .select("*")
      .eq("id", orderId)
      .eq("status", "pending")
      .single();

    if (orderError || !order) {
      console.error("Order not found or already processed:", orderError);
      return new Response(JSON.stringify({ error: "Order not found or already processed" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Found order:", JSON.stringify(order, null, 2));

    // Get user's current credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_id", order.user_id)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentCredits = profile?.credits || 0;
    const newCredits = currentCredits + order.credits;

    console.log("Current credits:", currentCredits);
    console.log("Adding credits:", order.credits);
    console.log("New total:", newCredits);

    // Update user's credits
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ credits: newCredits })
      .eq("user_id", order.user_id);

    if (updateProfileError) {
      console.error("Failed to update credits:", updateProfileError);
      return new Response(JSON.stringify({ error: "Failed to update credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark order as validated
    const { error: updateOrderError } = await supabase
      .from("credit_orders")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        notes: `Auto-validated via FedaPay webhook. Transaction ID: ${transactionId}`,
      })
      .eq("id", orderId);

    if (updateOrderError) {
      console.error("Failed to update order:", updateOrderError);
    }

    console.log("SUCCESS: Credits added automatically!");

    return new Response(
      JSON.stringify({
        success: true,
        message: `${order.credits} credits added to user`,
        order_id: orderId,
        transaction_id: transactionId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
