import { getScriptedResponse } from "@/lib/chat-data";
import { Message } from "@/lib/chat-data";

export interface WorkerResponseResult {
  response?: string;
  promptTokens?: number;
  error?: string;
  moderationFlagged?: boolean;
  source: "worker" | "scripted";
}

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL?.trim();

if (!WORKER_URL && process.env.NODE_ENV !== "production") {
  console.warn("NEXT_PUBLIC_WORKER_URL is not set. Falling back to scripted demo responses.");
}

export type WorkerAccessibilityStatus =
  | "not-configured"
  | "checking"
  | "online"
  | "offline";

export function isWorkerConfigured(): boolean {
  return Boolean(WORKER_URL);
}

export async function checkWorkerAccessibility(timeoutMs = 4000): Promise<WorkerAccessibilityStatus> {
  if (!WORKER_URL) return "not-configured";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(WORKER_URL, {
      method: "OPTIONS",
      signal: controller.signal,
    });

    return res.ok ? "online" : "offline";
  } catch {
    return "offline";
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getResponseFromWorker(messages: Message[]): Promise<WorkerResponseResult> {
  if (!WORKER_URL) {
    // Keep demo behavior working until a Worker URL is configured.
    // Use the last user message for scripted response
    const lastUserMessage = messages.find((m) => m.role === "user")?.content || "";
    return {
      response: getScriptedResponse(lastUserMessage),
      promptTokens: 0,
      source: "scripted",
    };
  }

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        error: data?.error || "Something went wrong.",
        moderationFlagged: data?.moderationFlagged || false,
        source: "worker",
      };
    }

    return {
      response: data?.response,
      promptTokens: data?.promptTokens || 0,
      source: "worker",
    };
  } catch {
    return {
      error: "Could not reach the demo server. Check your connection.",
      source: "worker",
    };
  }
}
