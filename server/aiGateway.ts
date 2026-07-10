import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { readDb } from "./database";

// Setup Gemini Client with OpenRouter transparent proxy support
function translateGeminiToOpenRouterMessages(contents: any, systemInstruction?: any): any[] {
  const messages: any[] = [];
  if (systemInstruction) {
    if (typeof systemInstruction === 'string') {
      messages.push({ role: "system", content: systemInstruction });
    } else if (systemInstruction.text) {
      messages.push({ role: "system", content: systemInstruction.text });
    } else if (Array.isArray(systemInstruction.parts)) {
      const text = systemInstruction.parts.map((p: any) => p.text || "").join("\n");
      messages.push({ role: "system", content: text });
    }
  }

  const parseParts = (parts: any[]) => {
    const contentArray: any[] = [];
    for (const part of parts) {
      if (part.text) {
        contentArray.push({ type: "text", text: part.text });
      } else if (part.inlineData) {
        const { mimeType, data } = part.inlineData;
        contentArray.push({
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${data}`
          }
        });
      }
    }
    return contentArray;
  };

  if (typeof contents === "string") {
    messages.push({ role: "user", content: contents });
  } else if (Array.isArray(contents)) {
    for (const content of contents) {
      const role = content.role === "model" ? "assistant" : "user";
      if (Array.isArray(content.parts)) {
        const parsed = parseParts(content.parts);
        if (parsed.length === 1 && parsed[0].type === "text") {
          messages.push({ role, content: parsed[0].text });
        } else {
          messages.push({ role, content: parsed });
        }
      } else if (typeof content.text === "string") {
        messages.push({ role, content: content.text });
      }
    }
  } else if (contents && typeof contents === "object") {
    if (Array.isArray(contents.parts)) {
      const parsed = parseParts(contents.parts);
      if (parsed.length === 1 && parsed[0].type === "text") {
        messages.push({ role: "user", content: parsed[0].text });
      } else {
        messages.push({ role: "user", content: parsed });
      }
    } else if (contents.text) {
      messages.push({ role: "user", content: contents.text });
    }
  }

  return messages;
}

// NOTE: OpenRouter's free-tier roster rotates constantly - providers add and pull
// ":free" models with no notice. This list is just a *starting preference order*;
// updateAvailableModels() below re-verifies it against the live catalog every 10
// minutes and automatically tops it up with whatever other free models are
// currently live, so the fallback chain doesn't collapse to a single model just
// because one of these IDs goes stale. Still, refresh this list periodically -
// as of this writing DeepSeek and Mistral currently have zero free models on
// OpenRouter, which is why they were removed from the old version of this list.
const FREE_MODELS_PRIORITIZED = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-20b:free",
  "openai/gpt-oss-120b:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3-32b:free"
];

// Custom error for when all free AI providers are rate-limited or busy
export class AllProvidersBusyError extends Error {
  public success = false;
  public retryAfter: number;
  constructor(retryAfter: number, message = "All free AI providers are currently busy. Please try again in a few moments.") {
    super(message);
    this.name = "AllProvidersBusyError";
    this.retryAfter = retryAfter;
  }
}

// Global Provider Health Monitor / Circuit Breaker
export class ProviderHealthMonitor {
  private static statuses = new Map<string, {
    retryAfterTime: number; // MS timestamp when the model becomes available again
    failureCount: number;
  }>();

  public static isModelAvailable(model: string): boolean {
    const status = this.statuses.get(model);
    if (!status) return true;
    return Date.now() >= status.retryAfterTime;
  }

  public static getRetryAfterSeconds(model: string): number {
    const status = this.statuses.get(model);
    if (!status) return 0;
    const remainingMs = status.retryAfterTime - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  public static setModelUnavailable(model: string, retryAfterSeconds: number) {
    const coolOffDuration = (retryAfterSeconds && retryAfterSeconds > 0) ? retryAfterSeconds : 15;
    const retryAfterTime = Date.now() + coolOffDuration * 1000;
    
    const existing = this.statuses.get(model) || { failureCount: 0, retryAfterTime: 0 };
    this.statuses.set(model, {
      retryAfterTime,
      failureCount: existing.failureCount + 1
    });
    console.warn(`[ProviderHealthMonitor] Model [${model}] marked unavailable for ${coolOffDuration}s (until ${new Date(retryAfterTime).toLocaleTimeString()})`);
  }

  public static setModelAvailable(model: string) {
    this.statuses.set(model, {
      retryAfterTime: 0,
      failureCount: 0
    });
  }

  public static getMinRetryAfterSeconds(models: string[]): number {
    let minTime = Infinity;
    for (const m of models) {
      const status = this.statuses.get(m);
      if (status && status.retryAfterTime > Date.now()) {
        if (status.retryAfterTime < minTime) {
          minTime = status.retryAfterTime;
        }
      } else {
        // If even one model is available, retryAfter is 0
        return 0;
      }
    }
    if (minTime === Infinity) return 15; // default fallback
    return Math.max(1, Math.round((minTime - Date.now()) / 1000));
  }
}

async function getOrWaitForAvailableModel(models: string[]): Promise<string> {
  const maxQueueWaitMs = 15000; // wait up to 15 seconds in queue
  const startTime = Date.now();

  while (true) {
    // Find first available model
    for (const model of models) {
      if (ProviderHealthMonitor.isModelAvailable(model)) {
        return model;
      }
    }

    // No model is currently available. Check how long we have to wait.
    const minRetryAfter = ProviderHealthMonitor.getMinRetryAfterSeconds(models);
    const elapsed = Date.now() - startTime;

    if (minRetryAfter > 0 && minRetryAfter <= 10 && (elapsed + minRetryAfter * 1000) < maxQueueWaitMs) {
      console.log(`[AI Gateway Queue] All providers busy. Waiting for ${minRetryAfter}s until next provider recovers...`);
      await new Promise((resolve) => setTimeout(resolve, minRetryAfter * 1000));
      // Loop again to check availability
    } else {
      // Too long to wait, or exceeded max wait time. Throw structured error.
      const retryAfterVal = minRetryAfter > 0 ? minRetryAfter : 15;
      throw new AllProvidersBusyError(retryAfterVal);
    }
  }
}

let verifiedAvailableModels: string[] = [...FREE_MODELS_PRIORITIZED];
let lastModelCheckTime = 0;

async function updateAvailableModels() {
  const now = Date.now();
  if (now - lastModelCheckTime < 10 * 60 * 1000) { // check every 10 mins
    return;
  }
  try {
    console.log("[AI Gateway Model Router] Querying OpenRouter available models...");
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (res.ok) {
      const data = await res.json();
      const allModels: any[] = data.data || [];

      // Full set of every free-tier model OpenRouter currently offers, not just ours.
      const liveFreeModelIds = allModels
        .map((m: any) => m.id)
        .filter((id: any): id is string => typeof id === "string" && id.endsWith(":free"));
      const liveFreeModelIdSet = new Set(liveFreeModelIds);

      // Keep our curated priority order for whichever of our preferred models are
      // still live...
      const stillLivePrioritized = FREE_MODELS_PRIORITIZED.filter(m => liveFreeModelIdSet.has(m));

      // ...then top up with any other currently-live free models the catalog offers.
      // This is the key fix: previously we only ever used the intersection of our
      // hardcoded list with the live catalog, so as soon as most of our hardcoded
      // IDs went stale (models get renamed/retired often), the fallback chain
      // silently collapsed down to whichever single model happened to still match -
      // exactly what the logs showed.
      const extraLiveModels = liveFreeModelIds.filter(id => !stillLivePrioritized.includes(id));
      const combined = [...stillLivePrioritized, ...extraLiveModels].slice(0, 8);

      if (combined.length > 0) {
        verifiedAvailableModels = combined;
        if (stillLivePrioritized.length < 2) {
          console.warn(`[AI Gateway Model Router] Only ${stillLivePrioritized.length}/${FREE_MODELS_PRIORITIZED.length} curated models are still live on OpenRouter. Topped up with ${extraLiveModels.length} other live free models - consider refreshing FREE_MODELS_PRIORITIZED.`);
        }
        console.log("[AI Gateway Model Router] Verified models available on OpenRouter:", verifiedAvailableModels);
      } else {
        console.error("[AI Gateway Model Router] OpenRouter returned zero live :free models. Falling back to hardcoded list, which may itself be stale.");
        verifiedAvailableModels = [...FREE_MODELS_PRIORITIZED];
      }
      lastModelCheckTime = now;
    }
  } catch (err) {
    console.warn("[AI Gateway Model Router] Failed to verify models from OpenRouter API, using default list:", err);
    verifiedAvailableModels = [...FREE_MODELS_PRIORITIZED];
  }
}

// Deduplication map for simultaneous identical requests
const activeOpenRouterPromises = new Map<string, Promise<any>>();

// Queue for sequentializing/rate-limiting concurrent requests to OpenRouter to stay within free-tier limits
class OpenRouterQueue {
  private queue: (() => Promise<void>)[] = [];
  private activeCount = 0;
  private maxConcurrency = 1;

  public async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };

      this.queue.push(run);
      this.processNext();
    });
  }

  private async processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const nextTask = this.queue.shift();
    if (nextTask) {
      try {
        await nextTask();
      } catch (err) {
        // Handled in add promise
      } finally {
        this.activeCount--;
        this.processNext();
      }
    }
  }
}

const openRouterQueue = new OpenRouterQueue();

async function executeOpenRouterWithFallback(params: any): Promise<any> {
  await updateAvailableModels();

  let lastError: any = null;
  const modelsToTry = [...verifiedAvailableModels];

  while (modelsToTry.length > 0) {
    let model: string;
    try {
      model = await getOrWaitForAvailableModel(modelsToTry);
    } catch (err) {
      if (err instanceof AllProvidersBusyError) {
        throw err;
      }
      throw new AllProvidersBusyError(15);
    }

    console.log(`[AI Gateway Router] Selected model: ${model}`);

    try {
      const messages = translateGeminiToOpenRouterMessages(params.contents, params.config?.systemInstruction);

      const payload: any = {
        model: model,
        messages: messages,
        temperature: params.config?.temperature ?? 0.8,
        max_tokens: params.config?.maxOutputTokens ?? 2048,
      };

      if (params.config?.responseMimeType === "application/json") {
        payload.response_format = { type: "json_object" };
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai.studio/build",
          "X-Title": "Kisan Alert AI Copilot"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let retryAfterSecs = 15;
        const retryAfterHeader = response.headers.get("Retry-After");
        if (retryAfterHeader) {
          const secs = parseInt(retryAfterHeader, 10);
          if (!isNaN(secs) && secs > 0) {
            retryAfterSecs = secs;
          }
        }

        const errText = await response.text();
        const error: any = new Error(`Status ${response.status} - ${errText}`);
        error.status = response.status;
        error.retryAfterSecs = retryAfterSecs;
        throw error;
      }

      const data = await response.json();
      const textResult = data.choices?.[0]?.message?.content || "";

      console.log(`[AI Gateway Router SUCCESS] Model [${model}] successfully answered the request.`);
      ProviderHealthMonitor.setModelAvailable(model);

      return {
        text: textResult,
        candidates: [
          {
            content: {
              parts: [{ text: textResult }]
            },
            groundingMetadata: {
              groundingChunks: []
            }
          }
        ]
      };
    } catch (err: any) {
      lastError = err;
      const status = err.status || 0;
      const errMsg = err.message || String(err);
      const isRateLimit = status === 429 || errMsg.includes("429") || errMsg.includes("rate-limited") || errMsg.includes("quota");
      const isTemporary = status === 503 || errMsg.includes("503") || errMsg.includes("temporary") || errMsg.includes("overloaded");

      if (isRateLimit || isTemporary) {
        const coolOff = err.retryAfterSecs || 15;
        console.warn(`[AI Gateway Router] Model [${model}] rate-limited/busy (status ${status}). Marking unavailable for ${coolOff}s.`);
        ProviderHealthMonitor.setModelUnavailable(model, coolOff);
        
        const idx = modelsToTry.indexOf(model);
        if (idx > -1) {
          modelsToTry.splice(idx, 1);
        }
      } else {
        console.error(`[AI Gateway Router] Model [${model}] failed with terminal error.`, err);
        const idx = modelsToTry.indexOf(model);
        if (idx > -1) {
          modelsToTry.splice(idx, 1);
        }
      }
    }
  }

  console.error("[AI Gateway Router ERROR] All tried models failed.", lastError);
  const minRetry = ProviderHealthMonitor.getMinRetryAfterSeconds(verifiedAvailableModels);
  throw new AllProvidersBusyError(minRetry > 0 ? minRetry : 15);
}

async function callOpenRouterFromGeminiParams(params: any): Promise<any> {
  const fingerprint = JSON.stringify({
    contents: params.contents,
    systemInstruction: params.config?.systemInstruction,
    responseMimeType: params.config?.responseMimeType
  });

  const existingPromise = activeOpenRouterPromises.get(fingerprint);
  if (existingPromise) {
    console.log(`[AI Gateway Router] De-duplicating/Merging identical concurrent request.`);
    return existingPromise;
  }

  const promise = openRouterQueue.add(() => executeOpenRouterWithFallback(params));
  activeOpenRouterPromises.set(fingerprint, promise);

  promise.finally(() => {
    activeOpenRouterPromises.delete(fingerprint);
  });

  return promise;
}

async function* callOpenRouterStreamFromGeminiParams(params: any): AsyncGenerator<{ text: string }> {
  await updateAvailableModels();

  let success = false;
  let lastError: any = null;
  const modelsToTry = [...verifiedAvailableModels];

  while (modelsToTry.length > 0) {
    let model: string;
    try {
      model = await getOrWaitForAvailableModel(modelsToTry);
    } catch (err) {
      if (err instanceof AllProvidersBusyError) {
        throw err;
      }
      throw new AllProvidersBusyError(15);
    }

    console.log(`[AI Gateway Router Stream] Selected model: ${model}`);

    try {
      const messages = translateGeminiToOpenRouterMessages(params.contents, params.config?.systemInstruction);

      const payload: any = {
        model: model,
        messages: messages,
        temperature: params.config?.temperature ?? 0.8,
        max_tokens: params.config?.maxOutputTokens ?? 2048,
        stream: true
      };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai.studio/build",
          "X-Title": "Kisan Alert AI Copilot"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let retryAfterSecs = 15;
        const retryAfterHeader = response.headers.get("Retry-After");
        if (retryAfterHeader) {
          const secs = parseInt(retryAfterHeader, 10);
          if (!isNaN(secs) && secs > 0) {
            retryAfterSecs = secs;
          }
        }

        const errText = await response.text();
        const error: any = new Error(`Status ${response.status} - ${errText}`);
        error.status = response.status;
        error.retryAfterSecs = retryAfterSecs;
        throw error;
      }

      if (!response.body) {
        throw new Error("No stream body returned");
      }

      if (typeof (response.body as any).getReader === "function") {
        const reader = (response.body as any).getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith("data: ")) {
              const raw = trimmed.slice(6).trim();
              if (raw === "[DONE]") {
                break;
              }
              try {
                const parsed = JSON.parse(raw);
                const text = parsed.choices?.[0]?.delta?.content || "";
                if (text) {
                  yield { text };
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
      } else {
        const readable = response.body as any;
        let buffer = "";
        for await (const chunk of readable) {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith("data: ")) {
              const raw = trimmed.slice(6).trim();
              if (raw === "[DONE]") {
                break;
              }
              try {
                const parsed = JSON.parse(raw);
                const text = parsed.choices?.[0]?.delta?.content || "";
                if (text) {
                  yield { text };
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
      }

      console.log(`[AI Gateway Router Stream SUCCESS] Model [${model}] successfully finished streaming.`);
      success = true;
      ProviderHealthMonitor.setModelAvailable(model);
      return;
    } catch (err: any) {
      lastError = err;
      const status = err.status || 0;
      const errMsg = err.message || String(err);
      const isRateLimit = status === 429 || errMsg.includes("429") || errMsg.includes("rate-limited") || errMsg.includes("quota");
      const isTemporary = status === 503 || errMsg.includes("503") || errMsg.includes("temporary") || errMsg.includes("overloaded");

      if (isRateLimit || isTemporary) {
        const coolOff = err.retryAfterSecs || 15;
        console.warn(`[AI Gateway Router Stream] Model [${model}] rate-limited/busy (status ${status}). Marking unavailable for ${coolOff}s.`);
        ProviderHealthMonitor.setModelUnavailable(model, coolOff);
        
        const idx = modelsToTry.indexOf(model);
        if (idx > -1) {
          modelsToTry.splice(idx, 1);
        }
      } else {
        console.error(`[AI Gateway Router Stream] Model [${model}] failed with terminal error.`, err);
        const idx = modelsToTry.indexOf(model);
        if (idx > -1) {
          modelsToTry.splice(idx, 1);
        }
      }
    }
  }

  if (!success) {
    console.error("[AI Gateway Router Stream ERROR] All tried models failed for streaming.", lastError);
    const minRetry = ProviderHealthMonitor.getMinRetryAfterSeconds(verifiedAvailableModels);
    throw new AllProvidersBusyError(minRetry > 0 ? minRetry : 15);
  }
}

async function callOpenRouterFromGeminiWithFallback(params: any): Promise<any> {
  try {
    return await callOpenRouterFromGeminiParams(params);
  } catch (err) {
    if (process.env.GEMINI_API_KEY) {
      console.warn("[AI Gateway Fallback] OpenRouter call failed. Switching to Native Gemini...", err);
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      return await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: params.contents,
        config: params.config
      });
    } else {
      throw err;
    }
  }
}

async function* callOpenRouterStreamWithNativeFallback(params: any): AsyncGenerator<{ text: string }> {
  try {
    const stream = callOpenRouterStreamFromGeminiParams(params);
    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (err) {
    if (process.env.GEMINI_API_KEY) {
      console.warn("[AI Gateway Stream Fallback] OpenRouter stream failed. Switching to Native Gemini Stream...", err);
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      const nativeStream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: params.contents,
        config: params.config
      });
      for await (const chunk of nativeStream) {
        yield { text: chunk.text || "" };
      }
    } else {
      throw err;
    }
  }
}

let aiClient: GoogleGenAI | null = null;
export function getGeminiClient(): any {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      models: {
        generateContent: async (params: any) => {
          return await callOpenRouterFromGeminiWithFallback(params);
        },
        generateContentStream: async (params: any) => {
          return callOpenRouterStreamWithNativeFallback(params);
        }
      }
    };
  }

  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "MOCK_KEY";
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// In-memory cache with configurable TTL
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}
const gatewayCache = new Map<string, CacheEntry>();

export function getCachedData(key: string): any | null {
  const entry = gatewayCache.get(key);
  if (entry && Date.now() - entry.timestamp < entry.ttl) {
    return entry.data;
  }
  return null;
}

export function setCachedData(key: string, data: any, ttl = 30 * 60 * 1000) {
  gatewayCache.set(key, { data, timestamp: Date.now(), ttl });
}

// Request Coalescing (De-duplication of concurrent identical requests)
const pendingRequests = new Map<string, Promise<any>>();

// Queue for sequentializing/rate-limiting concurrent requests to Gemini to flatten QPS spikes
let activeRequestsCount = 0;
const requestQueue: (() => void)[] = [];
const MAX_CONCURRENT_GEMINI_CALLS = 1;

async function acquireToken(): Promise<void> {
  if (activeRequestsCount < MAX_CONCURRENT_GEMINI_CALLS) {
    activeRequestsCount++;
    return;
  }
  return new Promise((resolve) => {
    requestQueue.push(resolve);
  });
}

function releaseToken(): void {
  activeRequestsCount--;
  const next = requestQueue.shift();
  if (next) {
    activeRequestsCount++;
    next();
  }
}

// Exponential backoff retry helper
export async function callGeminiWithBackoff<T>(
  fn: (ai: GoogleGenAI) => Promise<T>,
  retries = 3,
  initialDelay = 1000
): Promise<T> {
  let delay = initialDelay;
  const ai = getGeminiClient();

  for (let i = 0; i < retries; i++) {
    try {
      await acquireToken();
      const result = await fn(ai);
      releaseToken();
      return result;
    } catch (error: any) {
      releaseToken();
      const errMsg = error?.message || String(error);
      const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota");
      const isServiceUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("overloaded");

      if ((isQuota || isServiceUnavailable) && i < retries - 1) {
        console.warn(`[AI Gateway] Quota/Service limit encountered (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2.5; // Exponential factor
      } else {
        throw error;
      }
    }
  }
  throw new Error("Gemini AI is temporarily unavailable because the project has reached its API quota. Please try again later.");
}

// Dynamic Farmer & Farm Context Builder
export interface FarmContext {
  farmerName: string;
  state: string;
  district: string;
  taluka: string;
  village: string;
  primaryCrop: string;
  farmSizeAcres: string;
  soilType: string;
  soilPh: string;
  nutrients: { n: string; p: string; k: string };
  groundwater: { depth: string; source: string };
  organicCertified: boolean;
  expenses: { total: number; categories: Record<string, number> };
  inventory: { items: string[] };
  sensors: { moisture: number; groundwater: number; motorStatus: string; leakage: string };
  history: string;
}

export function buildFarmContext(farmerId: string): FarmContext {
  const db = readDb();
  
  // Find User
  const user = db.users.find((u) => u.id === farmerId || u.username === farmerId) || db.users[0];
  const matchedFarmerId = user?.id || "USR-701";

  // Find Farm
  const farm = db.farms.find((f) => f.farmerId === matchedFarmerId);

  // Filter Expenses and limit categories to top 5 to prevent context bloat
  const userExpenses = db.expenses.filter((e) => e.farmerId === matchedFarmerId);
  const totalExpenses = userExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseCategories: Record<string, number> = {};
  userExpenses.forEach((e) => {
    expenseCategories[e.category] = (expenseCategories[e.category] || 0) + e.amount;
  });
  const sortedCategories = Object.entries(expenseCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const expenseCategoriesTrimmed: Record<string, number> = {};
  sortedCategories.forEach(([cat, amt]) => {
    expenseCategoriesTrimmed[cat] = amt;
  });

  // Filter Inventory and limit to top 5 items for telemetry context efficiency
  const userInventory = db.inventory.filter((i) => i.farmerId === matchedFarmerId);
  const inventoryItemsFull = userInventory.map((i) => `${i.item} (${i.quantity} ${i.unit})`);
  const inventoryItems = inventoryItemsFull.slice(0, 5);
  if (inventoryItemsFull.length > 5) {
    inventoryItems.push(`... and ${inventoryItemsFull.length - 5} other items`);
  }

  // IoT Sensors
  const sensors = db.iotSensors[matchedFarmerId] || {
    soilMoisturePercent: 40,
    groundwaterDepthFt: 200,
    motorStatus: "OFF",
    pipeLeakageStatus: "Normal"
  };

  // Crop History - sort by year descending and limit to top 3 entries to prevent prompt inflation
  const historyList = db.cropHistory
    .filter((h) => h.farmerId === matchedFarmerId)
    .sort((a, b) => Number(b.year) - Number(a.year));
  const historyCount = historyList.length;
  const history = historyList
    .slice(0, 3)
    .map((h) => `${h.year}: Crop: ${h.cropName}, Yield: ${h.yieldTonsPerAcre} tons/acre, Profit: ₹${h.profitInr}, Note: ${h.diseaseIncident || "No Disease"}`)
    .join("; ") + (historyCount > 3 ? ` ... and ${historyCount - 3} older entries omitted for context efficiency.` : "");

  return {
    farmerName: user?.name || "Farmer",
    state: user?.state || "Andhra Pradesh",
    district: user?.district || "Guntur",
    taluka: "Tenali",
    village: user?.village || "Tenali",
    primaryCrop: farm?.cropType || "Red Chilli",
    farmSizeAcres: farm?.acres ? String(farm.acres) : "7.4",
    soilType: "Clay Loam",
    soilPh: "6.8",
    nutrients: { n: "42", p: "18", k: "160" },
    groundwater: { depth: "215", source: "Borewell" },
    organicCertified: true,
    expenses: { total: totalExpenses, categories: expenseCategoriesTrimmed },
    inventory: { items: inventoryItems },
    sensors: {
      moisture: sensors.soilMoisturePercent,
      groundwater: sensors.groundwaterDepthFt,
      motorStatus: sensors.motorStatus,
      leakage: sensors.pipeLeakageStatus
    },
    history
  };
}

// Master Prompt Builder with compressed representation
export function buildMasterPrompt(context: FarmContext, language = "English"): string {
  const expenseSummary = Object.entries(context.expenses.categories)
    .map(([cat, amt]) => `${cat}: ₹${amt}`)
    .join(", ");

  return `
You are 'Kisan Copilot', an advanced agricultural AI intelligence assistant and Farm Operating System advisor.
You assist smallholder Indian farmers with real-time, data-driven, practical, organic-first advisories.
Your tone is warm, empathetic, professional, and encouraging.

CRITICAL - Farm Context (Reference this telemetry and details whenever relevant):
- Farmer Name: ${context.farmerName}
- Location: Village ${context.village}, District ${context.district}, State ${context.state}
- Primary Crop: ${context.primaryCrop} (Farm Size: ${context.farmSizeAcres} Acres)
- Soil: Clay Loam, pH: ${context.soilPh}. Nutrients NPK: N=${context.nutrients.n}, P=${context.nutrients.p}, K=${context.nutrients.k} mg/kg
- Ground Water: Depth ${context.groundwater.depth} ft, Source: ${context.groundwater.source}
- Organic Status: ${context.organicCertified ? "Certified Organic" : "Conventional"}
- Financial Summary: Total expenses ₹${context.expenses.total} (${expenseSummary || "No registered expenses"})
- Inventory: ${context.inventory.items.join(", ") || "Empty inventory"}
- IoT Telemetry: Soil Moisture: ${context.sensors.moisture}%, Groundwater Depth: ${context.sensors.groundwater}ft, Water Pump: ${context.sensors.motorStatus}, Leakage: ${context.sensors.leakage}
- Crop History: ${context.history || "No historical logs"}

Core Guidelines:
1. Support Organic/Bio-rational: Prioritize natural remedies (Neem extracts, sour buttermilk, botanical sprays, fermented concoctions) over aggressive chemical solutions.
2. Localization & Grammar: Respond STRICTLY in the requested language: "${language}". If requested in Telugu, Tamil, Hindi, or Kannada, reply in that native script with excellent, simple, clear grammar.
3. Keep answers friendly, practical, and highly readable (concise paragraphs, short bullet points). Do not write extremely long paragraphs.
4. Display a confidence score (e.g. "[Confidence Score: 92%]") whenever diagnostic, weather-suitability, crop predictions, or eligibility assessments are made.
`;
}

// Central Gateway executor with request coalescing, cache, and error handling
export async function executeAiTask(
  cacheKey: string,
  ttl: number,
  taskFn: (ai: GoogleGenAI) => Promise<any>
): Promise<any> {
  // Check Cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`[AI Gateway Cache Hit] Key: ${cacheKey}`);
    return cached;
  }

  // Check if identical request is already pending (Coalescing)
  let pending = pendingRequests.get(cacheKey);
  if (!pending) {
    pending = callGeminiWithBackoff(taskFn)
      .then((res) => {
        setCachedData(cacheKey, res, ttl);
        pendingRequests.delete(cacheKey);
        return res;
      })
      .catch((err) => {
        pendingRequests.delete(cacheKey);
        throw err;
      });
    pendingRequests.set(cacheKey, pending);
  } else {
    console.log(`[AI Gateway Request Coalesced] Waiting for pending call: ${cacheKey}`);
  }

  return pending;
}

export function handleGatewayError(error: any, res: any, defaultMsg = "All free AI providers are currently busy. Please try again in a few moments.") {
  const cleanReason = error?.message || String(error);
  console.error(`[AI Gateway Handled Error] Error: ${cleanReason}`);
  const retryAfter = error?.retryAfter || (error?.retryAfterSecs) || 29;
  return res.status(503).json({
    success: false,
    error: defaultMsg,
    retryAfter: retryAfter
  });
}

