// The Replicate account is linked through the connector gateway, so the
// stored key is a gateway connection key, not a raw Replicate token.
export const REPLICATE_API = "https://connector-gateway.lovable.dev/replicate/v1";

export function replicateHeaders(): Record<string, string> {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.LOVABLE_CONNECTOR_REPLICATE_API_KEY ?? process.env.REPLICATE_API_KEY;
  if (!lovable || !conn) throw new Error("The video engine account is not connected.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": conn,
  };
}

export function replicateError(status: number, body: any): Error {
  if (status === 402) return new Error("The video engine account has no credit. Top it up on replicate.com/account/billing.");
  return new Error(body?.detail ?? body?.error ?? `Video engine error ${status}`);
}
