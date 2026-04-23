import type { RequestHandler } from "express";
import { ethers } from "ethers";

const PIEVERSE_FACILITATOR = "https://facilitator.pieverse.io";
// Kite Passport testnet payment token
const KITE_PASSPORT_TOKEN = "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";

export interface ForgePaywallOptions {
  /** EVM address to receive payment (0x...). */
  payTo: string;
  /** Price in USDC as a decimal string e.g. "0.01" */
  price: string;
  description?: string;
  merchantName?: string;
}

export function forgePaywall(opts: ForgePaywallOptions): RequestHandler {
  const { payTo, price, description = "Forge API call", merchantName = "Forge Agent" } = opts;
  const maxAmountRequired = String(Math.round(parseFloat(price) * 1_000_000));

  return async (req, res, next) => {
    const paymentHeader = req.headers["x-payment"] as string | undefined;
    if (!paymentHeader) {
      return res.status(402).json({
        error: "X-PAYMENT header is required",
        accepts: [{
          scheme: "gokite-aa",
          network: "kite-testnet",
          maxAmountRequired,
          resource: `${req.protocol}://${req.headers.host}${req.originalUrl}`,
          description,
          mimeType: "application/json",
          payTo,
          maxTimeoutSeconds: 300,
          asset: KITE_PASSPORT_TOKEN,
          extra: null,
          merchantName,
        }],
        x402Version: 1,
      });
    }

    // Verify + settle via Pieverse facilitator
    try {
      const authorization = JSON.parse(
        Buffer.from(paymentHeader, "base64").toString("utf8")
      );

      const verifyRes = await fetch(`${PIEVERSE_FACILITATOR}/v2/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorization, network: "kite-testnet" }),
      });

      if (!verifyRes.ok) {
        return res.status(402).json({ error: "Payment verification failed" });
      }

      const settleRes = await fetch(`${PIEVERSE_FACILITATOR}/v2/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorization, network: "kite-testnet" }),
      });

      if (!settleRes.ok) {
        return res.status(402).json({ error: "Payment settlement failed" });
      }

      return next();
    } catch {
      return res.status(402).json({ error: "Invalid X-PAYMENT header" });
    }
  };
}
