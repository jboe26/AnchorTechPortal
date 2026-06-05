const PAYPAL_API_BASE = "https://api.paypal.com";

let cachedAccessToken: string | null = null;
let tokenExpiry: number | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET_KEY;

  if (!clientId || !secret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token");
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // Refresh 1 min before expiry

  return cachedAccessToken;
}

export async function createPayPalOrder(
  invoiceId: string,
  amount: number,
  description: string
): Promise<string> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: invoiceId,
          amount: {
            currency_code: "USD",
            value: amount.toFixed(2),
          },
          description: description,
        },
      ],
      application_context: {
        return_url: `${process.env.NEXTAUTH_URL}/client/payment-success`,
        cancel_url: `${process.env.NEXTAUTH_URL}/client/payment-cancelled`,
        notification_url: `${process.env.NEXTAUTH_URL}/api/webhooks/paypal`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("PayPal order creation failed:", error);
    throw new Error("Failed to create PayPal order");
  }

  const order = await response.json();
  return order.id;
}

export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("PayPal order capture failed:", error);
    throw new Error("Failed to capture PayPal order");
  }

  return await response.json();
}

export async function verifyPayPalWebhook(
  transmissionId: string,
  transmissionTime: string,
  certUrl: string,
  transmissionSig: string,
  webhookBody: string
): Promise<boolean> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: "SHA256withRSA",
        transmission_sig: transmissionSig,
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(webhookBody),
      }),
    }
  );

  if (!response.ok) {
    console.error("PayPal webhook verification failed");
    return false;
  }

  const result = await response.json();
  return result.verification_status === "SUCCESS";
}