"use client";

import { useState } from "react";
import { Eye, EyeOff, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SystemPromptPanelProps {
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
  cumulativeTokens?: number;
  userTurns?: number;
  className?: string;
}

const MAX_SYSTEM_PROMPT_CHARS = 300;

export function SystemPromptPanel({
  systemPrompt,
  onSystemPromptChange,
  isVisible,
  onToggleVisibility,
  cumulativeTokens = 0,
  userTurns = 0,
  className,
}: SystemPromptPanelProps) {
  const charCount = systemPrompt.length;
  const charPercentage = (charCount / MAX_SYSTEM_PROMPT_CHARS) * 100;
  const isNearLimit = charCount >= MAX_SYSTEM_PROMPT_CHARS * 0.75;
  const isAtLimit = charCount >= MAX_SYSTEM_PROMPT_CHARS;

  const handleChange = (newValue: string) => {
    if (newValue.length <= MAX_SYSTEM_PROMPT_CHARS) {
      onSystemPromptChange(newValue);
    }
  };
  return (
    <div className={cn("rounded-md border border-border bg-card p-2", className)}>
      {/* Context window badge */}
      {cumulativeTokens > 0 && (
        <div className="flex justify-center mb-2">
          <div className="px-3 py-1 bg-blue-500/15 border border-blue-500/30 rounded-full text-xs text-blue-600 dark:text-blue-400 font-mono">
            <span className="font-bold">{cumulativeTokens}</span> prompt_tokens • {userTurns} turn{userTurns !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Settings className="h-3 w-3 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">System Prompt</h3>
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-amber-500/20 rounded-full border border-amber-500/30">
            Usually Hidden
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
          className="text-muted-foreground hover:text-foreground h-6 text-xs px-2"
        >
          {isVisible ? (
            <>
              <EyeOff className="h-3 w-3 mr-1" />
              Hide
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Show
            </>
          )}
        </Button>
      </div>
      {isVisible && (
        <div className="relative mt-2">
          <Textarea
            value={systemPrompt}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(
              "min-h-[80px] max-h-[100px] font-mono text-xs bg-secondary border-border text-foreground resize-none pr-20",
              isAtLimit && "border-red-500/50 focus:ring-red-500/50"
            )}
            placeholder="Enter system prompt..."
          />
          
          {/* Character count overlay - smaller and lower */}
          <div className="absolute bottom-1 right-1 pointer-events-none flex flex-col items-end gap-0.5">
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
              {charCount}/{MAX_SYSTEM_PROMPT_CHARS}
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
      )}
      {!isVisible && (
        <div className="text-xs text-muted-foreground italic mt-1">
          System prompts are typically hidden from users in production...
        </div>
      )}
    </div>
  );
}
