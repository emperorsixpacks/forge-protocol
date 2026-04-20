import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import type { RequestHandler } from "express";

export interface MarcPaywallOptions {
  /** EVM address to receive payment (0x...). */
  payTo: string;
  /** Price in USD cents as string e.g. "0.01" */
  price: string;
  /** CAIP-2 network e.g. "eip155:2368" for Kite testnet */
  network?: string;
  description?: string;
}

export function marcPaywall(opts: MarcPaywallOptions): RequestHandler {
  const { payTo, price, network = "eip155:2368", description = "MARC API call" } = opts;
  const typedNetwork = network as `${string}:${string}`;

  const server = new x402ResourceServer();

  const routes = {
    "GET /*": {
      accepts: [{ scheme: "exact" as const, network: typedNetwork, price, payTo }],
      description,
    },
    "POST /*": {
      accepts: [{ scheme: "exact" as const, network: typedNetwork, price, payTo }],
      description,
    },
  };

  return paymentMiddleware(routes, server) as RequestHandler;
}
