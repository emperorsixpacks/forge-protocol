import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { RequestHandler } from "express";
const PIEVERSE_FACILITATOR = "https://facilitator.pieverse.io";
// Kite Passport testnet payment token (distinct from USDC)
const KITE_PASSPORT_TOKEN = "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";

export interface ForgePaywallOptions {
  /** EVM address to receive payment (0x...). */
  payTo: string;
  /** Price in USDC as a decimal string e.g. "0.01" — converted to wei (6 decimals) internally */
  price: string;
  description?: string;
}

export function forgePaywall(opts: ForgePaywallOptions): RequestHandler {
  const { payTo, price, description = "Forge API call" } = opts;

  const server = new x402ResourceServer(
    new HTTPFacilitatorClient({ url: PIEVERSE_FACILITATOR })
  );

  const routes = {
    "GET /*": {
      accepts: [{
        scheme: "gokite-aa" as const,
        network: "kite-testnet" as const,
        maxAmountRequired: String(Math.round(parseFloat(price) * 1_000_000)),
        asset: KITE_PASSPORT_TOKEN,
        payTo,
        maxTimeoutSeconds: 300,
        merchantName: description,
      }],
      description,
    },
    "POST /*": {
      accepts: [{
        scheme: "gokite-aa" as const,
        network: "kite-testnet" as const,
        maxAmountRequired: String(Math.round(parseFloat(price) * 1_000_000)),
        asset: KITE_PASSPORT_TOKEN,
        payTo,
        maxTimeoutSeconds: 300,
        merchantName: description,
      }],
      description,
    },
  };

  return paymentMiddleware(routes, server) as RequestHandler;
}
