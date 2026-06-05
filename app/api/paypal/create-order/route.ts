import { requireClient } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createPayPalOrder } from "@/lib/paypal";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await requireClient();
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID required" },
        { status: 400 }
      );
    }

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("Invoice")
      .select("*")
      .eq("id", invoiceId)
      .eq("clientId", session.userId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Invoice already paid" },
        { status: 400 }
      );
    }

    // Create PayPal order
    const orderId = await createPayPalOrder(
      invoiceId,
      invoice.amount,
      `Invoice ${invoice.number}`
    );

    return NextResponse.json({ orderId });
  } catch (error) {
    console.error("Create PayPal order error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}