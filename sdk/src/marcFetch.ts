import { wrapFetchWithPayment, x402Client } from "@x402/fetch";

export interface MarcFetchOptions {
  /** Configured x402Client with EVM scheme registered */
  client: x402Client;
}

/**
 * Returns a fetch-compatible function that automatically handles HTTP 402
 * responses by signing and submitting an EVM payment, then retrying.
 *
 * @example
 * ```ts
 * import { x402Client } from "@x402/fetch";
 * import { ExactEvmScheme } from "@x402/evm";
 * import { ethers } from "ethers";
 *
 * const signer = new ethers.Wallet(privateKey, provider);
 * const client = new x402Client().register("eip155:2368", new ExactEvmScheme(signer));
 * const paidFetch = marcFetch({ client });
 * ```
 */
export function marcFetch(opts: MarcFetchOptions) {
  return wrapFetchWithPayment(fetch, opts.client);
}
