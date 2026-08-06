import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";

/** Provider AI SDK branché sur la passerelle Lovable AI. */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

export const AI_MODEL = "google/gemini-2.5-flash";
