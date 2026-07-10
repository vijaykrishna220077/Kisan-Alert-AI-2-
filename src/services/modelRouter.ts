/**
 * ModelRouter Service
 * Manages an array of free OpenRouter model IDs and handles
 * fallback/retry routing for client-side queries.
 */

export interface ModelRouterContext {
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  chatHistory?: Array<{ sender: 'user' | 'assistant' | 'copilot'; text: string }>;
}

export class ModelRouter {
  private models: string[];

  constructor(customModels?: string[]) {
    // Array of prioritized free models from OpenRouter
    this.models = customModels || [
      "meta-llama/llama-3.3-70b-instruct:free", // Primary Model
      "google/gemma-3-27b-it:free",              // Fallback Gemma
      "qwen/qwen3-32b:free",                     // Fallback Qwen
      "mistralai/mistral-small-24b-instruct-2501:free", // Fallback Mistral 2501
      "mistralai/mistral-small-3.2-24b-instruct:free", // Fallback Mistral 3.2
      "deepseek/deepseek-r1:free"                // Fallback DeepSeek
    ];
  }

  /**
   * Returns the list of currently configured models.
   */
  public getModels(): string[] {
    return this.models;
  }

  /**
   * Queries the prompt using a fallback mechanism.
   * Catches 429 rate-limits, respects the Retry-After header,
   * and falls back to subsequent free models sequentially.
   */
  public async query(
    prompt: string,
    context?: ModelRouterContext
  ): Promise<{ text: string; modelUsed: string; raw?: any }> {
    let lastError: any = null;

    for (const model of this.models) {
      console.log(`[ModelRouter] Attempting request using model: ${model}`);
      
      let attempts = 0;
      const maxRetries = 2; // Maximum retries on a single model for 429s

      while (attempts < maxRetries) {
        try {
          let response: Response;
          const clientApiKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || "";

          if (clientApiKey) {
            console.log(`[ModelRouter] Making direct client request to OpenRouter for model: ${model}`);
            response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${clientApiKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Kisan Alert AI Copilot"
              },
              body: JSON.stringify({
                model,
                messages: [
                  ...(context?.systemInstruction ? [{ role: "system", content: context.systemInstruction }] : []),
                  ...(context?.chatHistory || []).map((ch) => ({
                    role: ch.sender === 'user' ? 'user' : 'assistant',
                    content: ch.text
                  })),
                  { role: "user", content: prompt }
                ],
                temperature: context?.temperature ?? 0.8,
                max_tokens: context?.maxTokens ?? 2048,
              })
            });
          } else {
            console.log(`[ModelRouter] Proxying model request through backend server for model: ${model}`);
            response = await fetch("/api/query-model", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                prompt,
                context,
                model
              })
            });
          }

          if (!response.ok) {
            if (response.status === 429) {
              const retryAfterHeader = response.headers.get("Retry-After");
              let delayMs = 1000; // default 1s delay
              if (retryAfterHeader) {
                const seconds = parseInt(retryAfterHeader, 10);
                if (!isNaN(seconds) && seconds > 0) {
                  delayMs = seconds * 1000;
                }
              }
              console.warn(`[ModelRouter] 429 Rate Limited on ${model}. Respecting Retry-After delay of ${delayMs}ms.`);
              attempts++;
              if (attempts < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                continue; // Retry this model
              } else {
                throw new Error(`Rate limit exceeded for model: ${model}`);
              }
            } else {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
          }

          const data = await response.json();
          console.log(`[ModelRouter SUCCESS] Query resolved successfully using model: ${model}`);
          
          let responseText = "";
          if (clientApiKey) {
            responseText = data.choices?.[0]?.message?.content || "";
          } else {
            responseText = data.text || data.choices?.[0]?.message?.content || "";
          }

          return {
            text: responseText,
            modelUsed: model,
            raw: data
          };

        } catch (error: any) {
          console.error(`[ModelRouter] Request failed on model ${model}:`, error.message || error);
          lastError = error;
          break; // Exit retry loop and switch to next model in list
        }
      }
    }

    console.error("[ModelRouter] Exhausted all fallback models in the routing queue.", lastError);
    throw new Error(
      lastError?.message || "All free AI providers are currently busy. Please try again in a few moments."
    );
  }
}
