"use client";

import { Token } from "@/lib/tokenizer";
import { cn } from "@/lib/utils";

interface TokenDisplayProps {
  tokens: Token[];
  showIds?: boolean;
  className?: string;
}

export function TokenDisplay({
  tokens,
  showIds = true,
  className,
}: TokenDisplayProps) {
  if (tokens.length === 0) {
    return (
      <div className="text-muted-foreground text-sm italic">
        Type something to see tokens...
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tokens.map((token, index) => (
        <div
          key={index}
          className={cn(
            "inline-flex flex-col items-center rounded border px-1.5 py-0.5 font-mono text-sm transition-all hover:scale-105",
            token.color
          )}
        >
          <span className="text-foreground whitespace-pre">
            {token.text === " " ? "␣" : token.text === "\n" ? "↵" : token.text}
          </span>
          {showIds && (
            <span className="text-[10px] text-muted-foreground">{token.id}</span>
          )}
        </div>
      ))}
    </div>
  );
}
