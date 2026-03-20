// Cloudflare Worker - AI Transparency Demo Proxy
// Sits between the frontend and Groq API
// Handles: rate limiting, prompt validation, key protection, content moderation

const RATE_LIMIT_REQUESTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const DAILY_LIMIT_PER_IP = 20;
const GLOBAL_DAILY_CAP = 800;
const MAX_CONTEXT_CHARS = 1500; // Total character count across all messages
const MAX_MESSAGES_PER_REQUEST = 12;
const MAX_MESSAGE_CHARS = 600;
const MAX_RESPONSE_TOKENS = 200;

// Llama Guard content moderation check
async function checkLlamaGuard(messages, groqApiKey) {
  try {
    const guardRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-guard-4-12b",
          messages: messages,
          temperature: 0,
          max_tokens: 100,
        }),
      }
    );

    const guardData = await guardRes.json();
    
    if (!guardRes.ok) {
      console.warn("Llama Guard check failed with upstream status:", guardRes.status);
      // Fail closed on moderation outages to avoid bypassing safeguards.
      return { safe: false, reason: "guard-upstream-error" };
    }

    const responseText = guardData?.choices?.[0]?.message?.content?.trim() || "";
    const firstLine = responseText.split("\n")[0]?.trim().toLowerCase() || "";
    const isSafe = firstLine.startsWith("safe");
    
    if (!isSafe) {
      // Extract violation category for logging
      const violationMatch = responseText.match(/\b(s\d+|S\d+)\b/);
      const violationCategory = violationMatch ? violationMatch[1] : "unknown";
      console.log("Content flagged by Llama Guard:", violationCategory);
    }

    return { safe: isSafe, reason: isSafe ? "safe" : "unsafe" };
  } catch (error) {
    console.warn("Llama Guard check error:", error);
    // Fail closed on runtime errors to avoid moderation bypass.
    return { safe: false, reason: "guard-runtime-error" };
  }
}

export default {
  async fetch(request, env) {
    try {
      const cors = (body, status) => corsResponse(body, status, request, env);

      if (request.method === "OPTIONS") {
        return cors(null, 204);
      }

      if (request.method !== "POST") {
        return cors(JSON.stringify({ error: "Method not allowed" }), 405);
      }

      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const now = Math.floor(Date.now() / 1000);

      const globalKey = `global:${new Date().toISOString().slice(0, 10)}`;
      const globalCount = parseInt((await env.RATE_KV.get(globalKey)) || "0", 10);
      if (globalCount >= GLOBAL_DAILY_CAP) {
        return cors(
          JSON.stringify({ error: "Daily demo limit reached. Try again tomorrow!" }),
          429
        );
      }

      const windowKey = `ip:${ip}:window:${Math.floor(now / RATE_LIMIT_WINDOW_SECONDS)}`;
      const windowCount = parseInt((await env.RATE_KV.get(windowKey)) || "0", 10);
      if (windowCount >= RATE_LIMIT_REQUESTS) {
        return cors(
          JSON.stringify({ error: "Too many requests. Please wait a minute." }),
          429
        );
      }

      const dailyKey = `ip:${ip}:day:${new Date().toISOString().slice(0, 10)}`;
      const dailyCount = parseInt((await env.RATE_KV.get(dailyKey)) || "0", 10);
      if (dailyCount >= DAILY_LIMIT_PER_IP) {
        return cors(
          JSON.stringify({
            error: "You've reached today's limit for this demo. Come back tomorrow!",
          }),
          429
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return cors(JSON.stringify({ error: "Invalid JSON body" }), 400);
      }

      // Accept messages array from frontend with strict validation.
      const allowedRoles = new Set(["system", "user", "assistant"]);
      const messages = (Array.isArray(body.messages) ? body.messages : [])
        .filter((m) => typeof m === "object" && m !== null)
        .map((m) => ({
          role: typeof m.role === "string" ? m.role : "",
          content: typeof m.content === "string" ? m.content : "",
        }))
        .filter(
          (m) =>
            allowedRoles.has(m.role) &&
            m.content.trim().length > 0 &&
            m.content.length <= MAX_MESSAGE_CHARS
        );

      if (messages.length === 0) {
        return cors(JSON.stringify({ error: "No messages provided" }), 400);
      }

      if (messages.length > MAX_MESSAGES_PER_REQUEST) {
        return cors(
          JSON.stringify({
            error: `Too many messages. Max ${MAX_MESSAGES_PER_REQUEST} per request for this demo.`,
          }),
          400
        );
      }

      // Calculate total character count across all messages
      const totalContextChars = messages.reduce((sum, m) => sum + (m.content || "").length, 0);
      if (totalContextChars > MAX_CONTEXT_CHARS) {
        return cors(
          JSON.stringify({
            error: `Context too long. Max ${MAX_CONTEXT_CHARS} characters total for this demo.`,
          }),
          400
        );
      }

      if (!env.GROQ_API_KEY) {
        return cors(
          JSON.stringify({ error: "Worker is missing GROQ_API_KEY secret." }),
          500
        );
      }

      // Check content moderation with Llama Guard before calling main model
      const guardCheck = await checkLlamaGuard(messages, env.GROQ_API_KEY);
      if (!guardCheck.safe) {
        return cors(
          JSON.stringify({ 
            error: "That prompt isn't something this demo can process.",
            moderationFlagged: true 
          }),
          400
        );
      }

      let aiResponse;
      let promptTokens = 0;
      try {
        const groqRes = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: messages,
              temperature: 0.7,
              max_tokens: MAX_RESPONSE_TOKENS,
              stop: ["\n\n", "###", "<END>"]
            }),
          }
        );

        const groqData = await groqRes.json();
        if (!groqRes.ok) {
          console.warn("Groq upstream error status:", groqRes.status);
          return cors(
            JSON.stringify({
              error: "AI request failed. Please try again.",
            }),
            502
          );
        }

        aiResponse = groqData?.choices?.[0]?.message?.content;
        promptTokens = groqData?.usage?.prompt_tokens || 0;

        if (!aiResponse) {
          throw new Error("Empty response from Groq");
        }
      } catch {
        return cors(
          JSON.stringify({ error: "AI request failed. Please try again." }),
          502
        );
      }

      await Promise.all([
        env.RATE_KV.put(windowKey, String(windowCount + 1), {
          expirationTtl: RATE_LIMIT_WINDOW_SECONDS * 2,
        }),
        env.RATE_KV.put(dailyKey, String(dailyCount + 1), {
          expirationTtl: 86400 * 2,
        }),
        env.RATE_KV.put(globalKey, String(globalCount + 1), {
          expirationTtl: 86400 * 2,
        }),
      ]);

      return cors(
        JSON.stringify({ 
          response: aiResponse,
          promptTokens: promptTokens
        }), 
        200
      );
    } catch {
      return cors(
        JSON.stringify({
          error: "Worker runtime error. Check KV binding and secrets configuration.",
        }),
        500
      );
    }
  },
};

function corsResponse(body, status, request, env) {
  const origin = request?.headers?.get("Origin") || "";
  const configuredOrigins = (env?.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const defaultOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const isGithubPages = /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin);
  const isAllowedOrigin =
    Boolean(origin) &&
    (defaultOrigins.includes(origin) || configuredOrigins.includes(origin) || isGithubPages);

  const allowOrigin = origin ? (isAllowedOrigin ? origin : "null") : "*";

  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    },
  });
}
