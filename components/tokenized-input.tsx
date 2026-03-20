"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Token, tokenize } from "@/lib/tokenizer";
import { cn } from "@/lib/utils";

interface TokenizedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_INPUT_CHARS = 300;

export function TokenizedInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Send a message...",
}: TokenizedInputProps) {
  const [showTokens, setShowTokens] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const tokens = tokenize(value);
  const charCount = value.length;
  const charPercentage = (charCount / MAX_INPUT_CHARS) * 100;
  const isNearLimit = charCount >= MAX_INPUT_CHARS * 0.75;
  const isAtLimit = charCount >= MAX_INPUT_CHARS;

  // Sync scroll between textarea and overlay
  const syncScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("scroll", syncScroll);
      return () => textarea.removeEventListener("scroll", syncScroll);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleChange = (newValue: string) => {
    if (newValue.length <= MAX_INPUT_CHARS) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      {/* Token toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowTokens(!showTokens)}
          className={cn(
            "flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition-all",
            showTokens
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <Hash className="h-3 w-3" />
          <span>Show Tokens</span>
          {showTokens && value && (
            <span className="ml-1 px-1.5 py-0.5 bg-primary-foreground/20 rounded text-[10px]">
              {tokens.length}
            </span>
          )}
        </button>
        {showTokens && value && (
          <div className="text-xs text-muted-foreground">
            ~{tokens.length} tokens
          </div>
        )}
      </div>

      {/* Input container */}
      <div className="relative flex gap-2 items-end">
        <div className="relative flex-1">
          {/* Token overlay */}
          {showTokens && value && (
            <div
              ref={overlayRef}
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-md border border-transparent px-3 py-2 font-mono text-sm"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {tokens.map((token, index) => (
                <span
                  key={index}
                  className={cn(
                    "inline rounded-sm px-0.5 mx-px transition-all",
                    token.color
                  )}
                  title={`Token ID: ${token.id}`}
                >
                  {token.text === "\n" ? (
                    <>
                      <span className="text-muted-foreground/50 text-xs">
                        ↵
                      </span>
                      <br />
                    </>
                  ) : (
                    token.text
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Actual textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full min-h-[44px] max-h-[200px] resize-none rounded-md border border-border px-3 py-2 text-sm",
              "bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-50",
              showTokens && value
                ? "text-transparent caret-foreground selection:bg-primary/30"
                : "text-foreground",
              isAtLimit && "border-red-500/50 focus:ring-red-500/50"
            )}
            style={{
              fontFamily: showTokens && value ? "monospace" : "inherit",
            }}
          />
          
          {/* Character count overlay - smaller and lower */}
          <div className="absolute bottom-1 right-2 pointer-events-none flex flex-col items-end gap-0.5">
            <div
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-sm backdrop-blur-sm transition-all",
                isAtLimit
                  ? "bg-red-500/80 text-white font-bold"
                  : isNearLimit
                  ? "bg-amber-500/80 text-white"
                  : "bg-muted/60 text-muted-foreground text-xs"
              )}
            >
              {charCount}/{MAX_INPUT_CHARS}
            </div>
            {/* Progress bar - smaller */}
            <div className="w-12 h-0.5 rounded-full bg-muted/40 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all rounded-full",
                  isAtLimit
                    ? "bg-red-500"
                    : isNearLimit
                    ? "bg-amber-500"
                    : "bg-primary"
                )}
                style={{ width: `${Math.min(charPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={onSubmit}
          disabled={!value.trim() || disabled}
          size="icon"
          className="h-11 w-11 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Token legend when visible */}
      {showTokens && value && (
        <div className="flex flex-wrap gap-1 p-2 bg-secondary/50 rounded-lg border border-border">
          <span className="text-xs text-muted-foreground mr-2">
            Token IDs:
          </span>
          {tokens.slice(0, 8).map((token, index) => (
            <span
              key={index}
              className={cn(
                "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
                token.color
              )}
            >
              <span className="font-mono">
                {token.text === " " ? "␣" : token.text === "\n" ? "↵" : token.text}
              </span>
              <span className="text-muted-foreground">({token.id})</span>
            </span>
          ))}
          {tokens.length > 8 && (
            <span className="text-xs text-muted-foreground">
              +{tokens.length - 8} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
