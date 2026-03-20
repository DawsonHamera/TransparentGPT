"use client";

import { encodingForModel } from "js-tiktoken";

export interface Token {
  text: string;
  id: number;
  color: string;
}

// Generate consistent colors for tokens
const TOKEN_COLORS = [
  "bg-emerald-500/30 border-emerald-400",
  "bg-blue-500/30 border-blue-400",
  "bg-amber-500/30 border-amber-400",
  "bg-pink-500/30 border-pink-400",
  "bg-cyan-500/30 border-cyan-400",
  "bg-orange-500/30 border-orange-400",
  "bg-indigo-500/30 border-indigo-400",
  "bg-rose-500/30 border-rose-400",
  "bg-teal-500/30 border-teal-400",
  "bg-lime-500/30 border-lime-400",
];

// Use the llama-3 encoding equivalent - cl100k_base
let enc: ReturnType<typeof encodingForModel> | null = null;

function getEncoding() {
  if (!enc) {
    try {
      // Use cl100k_base which is compatible with Llama 3.1
      enc = encodingForModel("gpt-3.5-turbo");
    } catch {
      // Fallback encoding
      enc = encodingForModel("gpt-3.5-turbo");
    }
  }
  return enc;
}

export function tokenize(text: string): Token[] {
  try {
    const encoding = getEncoding();
    const tokenIds = encoding.encode(text);
    
    const tokens: Token[] = [];

    for (const tokenId of tokenIds) {
      // Attempt to decode individual token to get text representation
      try {
        const singleTokenDecoded = encoding.decode([tokenId]);
        tokens.push({
          text: singleTokenDecoded,
          id: tokenId,
          color: TOKEN_COLORS[tokenId % TOKEN_COLORS.length],
        });
      } catch {
        // Fallback for tokens that can't be decoded individually
        tokens.push({
          text: `[${tokenId}]`,
          id: tokenId,
          color: TOKEN_COLORS[tokenId % TOKEN_COLORS.length],
        });
      }
    }

    return tokens;
  } catch (error) {
    console.warn("Tokenization error:", error);
    // Fallback: split by whitespace and punctuation
    const fallbackTokens = text.split(/(\s+|[.,!?;:])/g).filter((t) => t.length > 0);
    return fallbackTokens.map((text, idx) => ({
      text,
      id: idx,
      color: TOKEN_COLORS[idx % TOKEN_COLORS.length],
    }));
  }
}

export function countTokens(text: string): number {
  try {
    const encoding = getEncoding();
    return encoding.encode(text).length;
  } catch (error) {
    console.warn("Token count error:", error);
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
