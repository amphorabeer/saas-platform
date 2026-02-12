import crypto from "crypto";

const FLITT_API_URL = "https://pay.flitt.com";

function getConfig() {
  const merchantId = process.env.FLITT_MERCHANT_ID;
  const paymentKey = process.env.FLITT_PAYMENT_KEY;
  if (!merchantId || !paymentKey) {
    throw new Error("Flitt credentials not configured. Set FLITT_MERCHANT_ID and FLITT_PAYMENT_KEY.");
  }
  return { merchantId: Number(merchantId), paymentKey };
}

export function buildSignature(
  paymentKey: string,
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === "signature" || key === "response_signature_string") continue;
    if (value === null || value === undefined || value === "") continue;
    filtered[key] = String(value);
  }
  const sortedKeys = Object.keys(filtered).sort();
  const values = sortedKeys.map((k) => filtered[k]);
  const signatureString = [paymentKey, ...values].join("|");
  return crypto.createHash("sha1").update(signatureString).digest("hex");
}

export function verifySignature(
  paymentKey: string,
  params: Record<string, string | number | boolean | undefined | null>
): boolean {
  const receivedSignature = params.signature;
  if (!receivedSignature) return false;
  const calculated = buildSignature(paymentKey, params);
  return calculated === String(receivedSignature);
}

export async function createFlittPayment(params: {
  orderId: string;
  amount: number;
  currency?: string;
  orderDesc: string;
  responseUrl: string;
  serverCallbackUrl: string;
  language?: string;
  merchantData?: string;
}): Promise<{ checkoutUrl: string; paymentId: string }> {
  const { merchantId, paymentKey } = getConfig();
  const requestParams: Record<string, string | number> = {
    order_id: params.orderId,
    merchant_id: merchantId,
    order_desc: params.orderDesc,
    amount: params.amount,
    currency: params.currency || "GEL",
    response_url: params.responseUrl,
    server_callback_url: params.serverCallbackUrl,
  };
  if (params.language) requestParams.lang = params.language;
  if (params.merchantData) requestParams.merchant_data = params.merchantData;
  const signature = buildSignature(paymentKey, requestParams);
  const body = { request: { ...requestParams, signature } };
  console.log("[Flitt] Creating payment:", JSON.stringify(body, null, 2));
  const response = await fetch(`${FLITT_API_URL}/api/checkout/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (data.response.response_status !== "success" || !data.response.checkout_url) {
    console.error("[Flitt] Error:", JSON.stringify(data));
    throw new Error(`Flitt: ${data.response.error_message || "Unknown error"}`);
  }
  return { checkoutUrl: data.response.checkout_url, paymentId: data.response.payment_id || "" };
}

export async function getFlittOrderStatus(orderId: string) {
  const { merchantId, paymentKey } = getConfig();
  const requestParams: Record<string, string | number> = { order_id: orderId, merchant_id: merchantId };
  const signature = buildSignature(paymentKey, requestParams);
  const response = await fetch(`${FLITT_API_URL}/api/checkout/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request: { ...requestParams, signature } }),
  });
  const data = await response.json();
  return data.response;
}

export function parseAndVerifyCallback(data: Record<string, unknown>) {
  const { paymentKey } = getConfig();
  const verified = verifySignature(paymentKey, data as Record<string, string>);
  return { verified, callbackData: data as Record<string, any> };
}

export function toMinorUnits(amount: number): number { return Math.round(amount * 100); }
