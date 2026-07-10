/**
 * Centralized Client-Side AI Gateway Service
 * Manages all Gemini-powered API requests from the frontend.
 * Implements a Singleton instance with request queueing, request coalescing (merging),
 * token-based rate limiting, and exponential backoff retry mechanism.
 */

export interface ChatMessage {
  sender: 'user' | 'assistant' | 'copilot';
  text: string;
}

export interface CopilotChatParams {
  message: string;
  language: string;
  farmerProfile: any;
  chatHistory: ChatMessage[];
  enableThinking?: boolean;
  enableSearch?: boolean;
  enableMaps?: boolean;
  lat?: number;
  lng?: number;
  stream?: boolean;
  onChunk?: (text: string) => void;
  intent?: string;
}

export interface CropAdvisorParams {
  soilType: string;
  ph: number;
  n: number;
  p: number;
  k: number;
  waterSource: string;
  size: number;
  state: string;
  district: string;
}

export interface DiseaseDiagnosticParams {
  base64Image: string;
  cropName: string;
}

export interface SchemeEligibilityParams {
  farmerProfile: any;
  schemeName: string;
}

class AIGateway {
  private static instance: AIGateway;
  
  // Rate limiting / Queue settings
  private activeRequestsCount = 0;
  private maxConcurrentRequests = 2;
  private requestQueue: (() => void)[] = [];
  
  // Request Coalescing (Map of serialized request keys to active promises)
  private activePromises = new Map<string, Promise<any>>();

  // Cache for identical recent prompts to save token costs
  private promptCache = new Map<string, { response: string; timestamp: number }>();
  private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

  private constructor() {}

  public static getInstance(): AIGateway {
    if (!AIGateway.instance) {
      AIGateway.instance = new AIGateway();
    }
    return AIGateway.instance;
  }

  /**
   * Enqueues a request execution and respects the concurrency limits
   */
  private async enqueue<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeRequestsCount >= this.maxConcurrentRequests) {
      await new Promise<void>((resolve) => {
        this.requestQueue.push(resolve);
      });
    }
    
    this.activeRequestsCount++;
    try {
      return await task();
    } finally {
      this.activeRequestsCount--;
      const next = this.requestQueue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * Helper to perform request with exponential backoff retry
   * Retry mechanism with exponential backoff starting at 1s (1000ms), doubling up to 32s (32000ms) for HTTP 429.
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 6,
    initialDelay = 1000,
    maxDelay = 32000
  ): Promise<Response> {
    let delay = initialDelay;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        
        // Handle rate limits (429) or temporary server errors (503) specifically
        if ((response.status === 429 || response.status === 503) && i < retries - 1) {
          console.warn(`[AI Gateway Client] Status ${response.status} on ${url}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, maxDelay);
          continue;
        }
        return response;
      } catch (error) {
        if (i < retries - 1) {
          console.warn(`[AI Gateway Client] Network error on ${url}. Retrying in ${delay}ms...`, error);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, maxDelay);
          continue;
        }
        throw error;
      }
    }
    throw new Error("Failed after maximum retry attempts");
  }

  /**
   * Executes a task with coalescing/de-duplication
   */
  private async executeCoalesced<T>(cacheKey: string, task: () => Promise<T>): Promise<T> {
    const existingPromise = this.activePromises.get(cacheKey);
    if (existingPromise) {
      console.log(`[AI Gateway Client] Request coalesced/merged for key: ${cacheKey}`);
      return existingPromise as Promise<T>;
    }

    const promise = this.enqueue(task)
      .then((res) => {
        this.activePromises.delete(cacheKey);
        return res;
      })
      .catch((err) => {
        this.activePromises.delete(cacheKey);
        throw err;
      });

    this.activePromises.set(cacheKey, promise);
    return promise;
  }

  /**
   * Generic asynchronous send method to interact with the AI Gateway.
   * Handles RESOURCE_EXHAUSTED / 429 by returning a clean, non-crashing status.
   */
  public async send(
    prompt: string, 
    context?: any
  ): Promise<{ response: string; status: 'ok' | 'exhausted' | 'error'; error?: string }> {
    const cacheKey = `send:${prompt}:${JSON.stringify(context || {})}`;
    
    // Check local prompt cache
    const cached = this.promptCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
      console.log(`[AI Gateway Client] Serving cached send result for prompt: ${prompt.substring(0, 40)}...`);
      return { response: cached.response, status: 'ok' };
    }

    try {
      const result = await this.executeCoalesced(cacheKey, async () => {
        const response = await this.fetchWithRetry("/api/copilot-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: prompt,
            language: context?.language || "English",
            farmerProfile: context?.farmerProfile || {},
            chatHistory: context?.chatHistory || [],
            enableThinking: context?.enableThinking || false,
            enableSearch: context?.enableSearch || false,
            enableMaps: context?.enableMaps || false,
            lat: context?.lat,
            lng: context?.lng
          }),
        });

        const text = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch (e) {}

        if (!response.ok) {
          if (response.status === 429 || text.includes("RESOURCE_EXHAUSTED") || data?.error?.includes("quota") || data?.error?.includes("RESOURCE_EXHAUSTED")) {
            const errorObj = new Error("RESOURCE_EXHAUSTED");
            (errorObj as any).status = 429;
            throw errorObj;
          }
          throw new Error(data?.error || text || "Request failed");
        }

        return data.response || data.reply || "";
      });

      // Update cache
      this.promptCache.set(cacheKey, { response: result, timestamp: Date.now() });
      return { response: result, status: 'ok' };
    } catch (error: any) {
      console.error("[AI Gateway Client] send error:", error);
      const isQuota = error.status === 429 || 
                      error.message?.includes("RESOURCE_EXHAUSTED") || 
                      error.message?.includes("quota") || 
                      error.message?.includes("429");
                      
      if (isQuota) {
        return {
          response: "All free AI providers are currently busy. Please try again in a few moments.",
          status: 'exhausted',
          error: "RESOURCE_EXHAUSTED"
        };
      }
      return {
        response: "All free AI providers are currently busy. Please try again in a few moments.",
        status: 'error',
        error: error.message || String(error)
      };
    }
  }

  /**
   * Chat Endpoint with optional SSE Streaming Support
   */
  public async copilotChat(params: CopilotChatParams): Promise<any> {
    const { stream, onChunk, ...rest } = params;
    const cacheKey = `copilot-chat:${params.farmerProfile?.id || 'unknown'}:${params.language}:${params.message}:${params.chatHistory.length}`;

    // Streaming does not coalesce and bypasses standard JSON return
    if (stream && onChunk) {
      return this.enqueue(async () => {
        const response = await this.fetchWithRetry("/api/copilot-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...rest, stream: true }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Chat request failed");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) {
          throw new Error("ReadableStream not supported in this browser");
        }

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const raw = line.slice(6);
              if (raw === "[DONE]") {
                break;
              }
              try {
                const parsed = JSON.parse(raw);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.text) {
                  onChunk(parsed.text);
                }
              } catch (e: any) {
                if (e.message?.includes("quota")) {
                  throw e;
                }
              }
            }
          }
        }
        return { success: true };
      });
    }

    // Standard Coalesced Chat Request
    return this.executeCoalesced(cacheKey, async () => {
      const response = await this.fetchWithRetry("/api/copilot-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Chat request failed");
      }

      return response.json();
    });
  }

  /**
   * Crop Advisor Endpoint
   */
  public async getCropAdvisor(params: CropAdvisorParams): Promise<any> {
    const cacheKey = `crop-advisor:${params.soilType}:${params.ph}:${params.n}:${params.p}:${params.k}:${params.waterSource}:${params.size}`;
    
    return this.executeCoalesced(cacheKey, async () => {
      const response = await this.fetchWithRetry("/api/crop-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error("Failed to load crop recommendations");
      }

      return response.json();
    });
  }

  /**
   * Disease Diagnostic Endpoint
   */
  public async diagnoseDisease(params: DiseaseDiagnosticParams): Promise<any> {
    const cacheKey = `disease-diagnostic:${params.cropName}:${params.base64Image.length}:${params.base64Image.substring(0, 30)}`;
    
    return this.executeCoalesced(cacheKey, async () => {
      const response = await this.fetchWithRetry("/api/disease-diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error("Failed to diagnose crop disease");
      }

      return response.json();
    });
  }

  /**
   * Scheme Eligibility Evaluation Endpoint
   */
  public async checkSchemeEligibility(params: SchemeEligibilityParams): Promise<any> {
    const cacheKey = `scheme-eligibility:${params.farmerProfile?.id || 'unknown'}:${params.schemeName}`;
    
    return this.executeCoalesced(cacheKey, async () => {
      const response = await this.fetchWithRetry("/api/scheme-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error("Failed to evaluate government scheme eligibility");
      }

      return response.json();
    });
  }
}

export const aiGateway = AIGateway.getInstance();
