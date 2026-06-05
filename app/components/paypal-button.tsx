"use client";

import { useEffect } from "react";

interface PayPalButtonProps {
  invoiceId: string;
  amount: number;
  invoiceNumber: string;
}

declare global {
  interface Window {
    paypal: any;
  }
}

export function PayPalButton({
  invoiceId,
  amount,
  invoiceNumber,
}: PayPalButtonProps) {
  useEffect(() => {
    // Load PayPal SDK
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}`;
    script.async = true;
    script.onload = () => {
      if (window.paypal) {
        window.paypal
          .Buttons({
            createOrder: async (data: any, actions: any) => {
              const response = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId }),
              });

              if (!response.ok) {
                throw new Error("Failed to create payment order");
              }

              const { orderId } = await response.json();
              return orderId;
            },
            onApprove: async (data: any, actions: any) => {
              // PayPal will handle the capture, webhook will update status
              window.location.href = "/client/dashboard?payment=success";
            },
            onError: (error: any) => {
              console.error("Payment error:", error);
              alert("Payment failed. Please try again.");
            },
          })
          .render("#paypal-button-container");
      }
    };
    document.body.appendChild(script);

    return () => {
      const container = document.getElementById("paypal-button-container");
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [invoiceId]);

  return <div id="paypal-button-container" />;
}
