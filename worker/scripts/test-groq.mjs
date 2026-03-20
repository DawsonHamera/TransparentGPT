import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const model = "llama-3.1-8b-instant";
const prompt = process.argv.slice(2).join(" ") || "hello";

function readKeyFromDevVars() {
  const candidates = [
    path.resolve(process.cwd(), ".dev.vars"),
    path.resolve(process.cwd(), "worker", ".dev.vars"),
  ];

  const devVarsPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!devVarsPath) return null;

  const content = fs.readFileSync(devVarsPath, "utf8");
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("GROQ_API_KEY="));

  if (!line) return null;
  const key = line.slice("GROQ_API_KEY=".length).trim();
  return key || null;
}

async function main() {
  const envKey = process.env.GROQ_API_KEY?.trim();
  const fileKey = readKeyFromDevVars();
  const apiKey = envKey || fileKey;

  if (!apiKey) {
    console.error("Missing GROQ_API_KEY. Set it in environment or worker/.dev.vars.");
    process.exit(1);
  }

  console.log(`Using key source: ${envKey ? "process env" : "worker/.dev.vars"}`);
  console.log(`Key length: ${apiKey.length}`);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  const text = await response.text();
  console.log(`HTTP ${response.status}`);

  try {
    const json = JSON.parse(text);
    if (!response.ok) {
      console.error(JSON.stringify(json, null, 2));
      process.exit(1);
    }

    const content = json?.choices?.[0]?.message?.content;
    console.log("Response preview:");
    console.log(content || "<empty>");
  } catch {
    console.log(text);
    if (!response.ok) process.exit(1);
  }
}

main().catch((error) => {
  console.error("Test script failed:", error.message);
  process.exit(1);
});
