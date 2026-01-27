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

// Extract order_id from transaction custom_metadata with multiple fallbacks
function extractOrderId(transaction: any): string | null {
  if (!transaction) return null;
  
  // Try custom_metadata first (official method)
  const customMetadata = transaction.custom_metadata;
  if (customMetadata) {
    // Try different possible key names
    const orderId = customMetadata.order_id || customMetadata.orderId || customMetadata.orderID;
    if (orderId) {
      console.log("Found order_id in custom_metadata:", orderId);
      return orderId;
    }
  }
  
  // Legacy fallback: custom_id (old method, may not work)
  if (transaction.custom_id) {
    console.log("Found order_id in custom_id (legacy):", transaction.custom_id);
    return transaction.custom_id;
  }
  
  // Fallback: reference field
  if (transaction.reference) {
    console.log("Found order_id in reference:", transaction.reference);
    return transaction.reference;
  }
  
  return null;
}

// Fallback: find order by matching amount and email
async function findOrderByMatching(
  supabase: any,
  amount: number,
  customerEmail: string | null
): Promise<any | null> {
  console.log("Attempting fallback order matching:", { amount, customerEmail });
  
  // Search for pending orders created in the last 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  let query = supabase
    .from("credit_orders")
    .select("*")
    .eq("status", "pending")
    .eq("amount", amount)
    .gte("created_at", thirtyMinutesAgo)
    .order("created_at", { ascending: false })
    .limit(1);
  
  // Add email filter if available
  if (customerEmail) {
    query = query.eq("user_email", customerEmail);
  }
  
  const { data: orders, error } = await query;
  
  if (error) {
    console.error("Fallback matching error:", error);
    return null;
  }
  
  if (orders && orders.length > 0) {
    console.log("Fallback found matching order:", orders[0].id);
    return orders[0];
  }
  
  console.log("No matching order found via fallback");
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get("x-fedapay-signature") || "";

    console.log("=== FedaPay Webhook Received ===");
    console.log("Raw body length:", rawBody.length);
    console.log("Signature present:", !!signature);

    const event = JSON.parse(rawBody);
    console.log("Event parsed successfully");
    console.log("Event name:", event.name || event.type);

    // FedaPay sends different event types
    const eventName = event.name || event.type;
    const transaction = event.entity || event.data?.object;

    console.log("Transaction details:", JSON.stringify({
      id: transaction?.id,
      amount: transaction?.amount,
      status: transaction?.status,
      custom_metadata: transaction?.custom_metadata,
      custom_id: transaction?.custom_id,
      reference: transaction?.reference,
      customer: transaction?.customer,
      last_error_code: transaction?.last_error_code,
    }, null, 2));

    // Check if this is a successful payment event
    const successEvents = [
      "transaction.approved",
      "transaction.completed",
      "transaction.successful",
    ];

    // Check if this is a canceled/declined event
    const cancelEvents = [
      "transaction.canceled",
      "transaction.declined",
      "transaction.refunded",
    ];

    // Get transaction details
    const transactionId = transaction?.id?.toString();
    const amount = transaction?.amount;
    const status = transaction?.status;
    const errorCode = transaction?.last_error_code;
    const customerEmail = transaction?.customer?.email;

    // Extract order ID using the new method
    let orderId = extractOrderId(transaction);

    console.log("Extracted info:", {
      transactionId,
      orderId,
      amount,
      status,
      errorCode,
      customerEmail,
    });

    // Handle canceled/declined events
    if (cancelEvents.includes(eventName)) {
      console.log("Transaction canceled/declined:", eventName);
      
      // Try to find the order
      let order = null;
      if (orderId) {
        const { data } = await supabase
          .from("credit_orders")
          .select("*")
          .eq("id", orderId)
          .eq("status", "pending")
          .single();
        order = data;
      }
      
      // Fallback matching if no order found
      if (!order && amount) {
        order = await findOrderByMatching(supabase, amount, customerEmail);
      }
      
      if (order) {
        const { error: updateError } = await supabase
          .from("credit_orders")
          .update({
            status: "rejected",
            notes: `Annulée automatiquement: ${errorCode || eventName}. Transaction ID: ${transactionId || 'N/A'}`,
          })
          .eq("id", order.id);

        if (updateError) {
          console.error("Failed to update canceled order:", updateError);
        } else {
          console.log("Order marked as rejected:", order.id);
        }
      } else {
        console.log("No pending order found to mark as rejected");
      }

      return new Response(JSON.stringify({ received: true, action: "order_canceled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!successEvents.includes(eventName)) {
      console.log("Event not a success event, ignoring:", eventName);
      return new Response(JSON.stringify({ received: true, action: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the pending order
    let order = null;
    
    // Method 1: Direct lookup by order ID
    if (orderId) {
      const { data, error } = await supabase
        .from("credit_orders")
        .select("*")
        .eq("id", orderId)
        .eq("status", "pending")
        .single();
      
      if (!error && data) {
        order = data;
        console.log("Found order by ID:", order.id);
      } else {
        console.log("Order not found by ID, trying fallback...");
      }
    }
    
    // Method 2: Fallback matching
    if (!order && amount) {
      order = await findOrderByMatching(supabase, amount, customerEmail);
    }

    if (!order) {
      console.error("No matching order found for transaction");
      return new Response(JSON.stringify({ 
        error: "Order not found",
        details: { orderId, amount, customerEmail }
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing order:", JSON.stringify(order, null, 2));

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

    console.log("Credits update:", { currentCredits, adding: order.credits, newTotal: newCredits });

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
        notes: `Auto-validated via FedaPay. TX: ${transactionId}, Status: ${status}`,
      })
      .eq("id", order.id);

    if (updateOrderError) {
      console.error("Failed to update order:", updateOrderError);
    }

    console.log("=== SUCCESS: Credits added automatically! ===");

    return new Response(
      JSON.stringify({
        success: true,
        message: `${order.credits} credits added to user`,
        order_id: order.id,
        transaction_id: transactionId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("=== Webhook error ===", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
