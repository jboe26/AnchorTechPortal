import { supabase } from "@/lib/supabase";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headers = request.headers;

    // Get PayPal webhook headers
    const transmissionId = headers.get("paypal-transmission-id");
    const transmissionTime = headers.get("paypal-transmission-time");
    const certUrl = headers.get("paypal-cert-url");
    const transmissionSig = headers.get("paypal-transmission-sig");

    if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig) {
      return NextResponse.json(
        { error: "Missing webhook headers" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = await verifyPayPalWebhook(
      transmissionId,
      transmissionTime,
      certUrl,
      transmissionSig,
      body
    );

    if (!isValid) {
      console.error("PayPal webhook verification failed");
      return NextResponse.json(
        { error: "Webhook verification failed" },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);

    // Handle payment completed event
    if (event.event_type === "CHECKOUT.ORDER.COMPLETED") {
      const invoiceId = event.resource.purchase_units[0].reference_id;
      const status = event.resource.status;

      if (status === "COMPLETED") {
        // Update invoice as paid
        const { error } = await supabase
          .from("Invoice")
          .update({
            status: "paid",
            paidAt: new Date().toISOString(),
          })
          .eq("id", invoiceId);

        if (error) {
          console.error("Failed to update invoice:", error);
          return NextResponse.json(
            { error: "Failed to update invoice" },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}