"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Message } from "@/lib/chat-data";
import { getResponseFromWorker } from "@/lib/worker-api";
import { ChatMessage } from "./chat-message";
import { TokenizedInput } from "./tokenized-input";
import { ModerationErrorModal } from "./moderation-error-modal";
import { FlowStage } from "./animated-data-flow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  onInputChange?: (input: string) => void;
  onFlowStageChange?: (stage: FlowStage) => void;
  onContinueReady?: (ready: boolean) => void;
  onTokenHistoryChange?: (history: number[]) => void;
  onPendingResponseChange?: (response: string | null) => void;
  currentFlowStage: FlowStage;
  continueClicked?: boolean;
  skipClicked?: boolean;
  onContinueHandled?: () => void;
  onSkipHandled?: () => void;
  className?: string;
  systemPrompt?: string;
}

const FLOW_SEQUENCE: FlowStage[] = [
  "user-input",
  "client-format",
  "api-request",
  "server-receive",
  "tokenization",
  "embedding",
  "attention",
  "generation",
  "decode",
  "response",
  "complete",
];

const MAX_TURNS = 3;

export function ChatInterface({
  messages,
  onMessagesChange,
  onInputChange,
  onFlowStageChange,
  onContinueReady,
  onTokenHistoryChange,
  onPendingResponseChange,
  currentFlowStage,
  continueClicked,
  skipClicked,
  onContinueHandled,
  onSkipHandled,
  className,
  systemPrompt,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<string | null>(null);
  const [pendingTokens, setPendingTokens] = useState<number>(0);
  const [showResponse, setShowResponse] = useState(false);
  const [animatingMessageIndex, setAnimatingMessageIndex] = useState<number | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [tokenHistory, setTokenHistory] = useState<number[]>([]); // Track cumulative tokens
  const [showModerationError, setShowModerationError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const continueDelayRef = useRef<NodeJS.Timeout | null>(null);

  // Count user turns (messages with role "user")
  const userTurns = messages.filter((m) => m.role === "user").length;
  const sessionLocked = userTurns >= MAX_TURNS;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showResponse]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (continueDelayRef.current) {
        clearTimeout(continueDelayRef.current);
      }
    };
  }, []);

  // Handle continue button clicks from parent
  useEffect(() => {
    if (continueClicked && currentStageIndex >= 0) {
      onContinueHandled?.();
      advanceToNextStage();
    }
  }, [continueClicked]);

  // Notify parent when token history changes
  useEffect(() => {
    onTokenHistoryChange?.(tokenHistory);
  }, [tokenHistory, onTokenHistoryChange]);

  // Notify parent of pending response so decode/response steps can render real data.
  useEffect(() => {
    onPendingResponseChange?.(pendingResponse);
  }, [pendingResponse, onPendingResponseChange]);

  // Handle skip button: jump to complete and render response immediately.
  useEffect(() => {
    if (!skipClicked) return;

    onContinueReady?.(false);

    if (pendingResponse && currentStageIndex >= 0) {
      setCurrentStageIndex(FLOW_SEQUENCE.length - 1);
      onFlowStageChange?.("complete");
      setShowResponse(true);
    }

    onSkipHandled?.();
  }, [
    skipClicked,
    pendingResponse,
    currentStageIndex,
    onContinueReady,
    onFlowStageChange,
    onSkipHandled,
  ]);

  const handleInputChange = (value: string) => {
    setInput(value);
    onInputChange?.(value);
  };

  const advanceToNextStage = () => {
    onContinueReady?.(false);
    
    const nextIndex = currentStageIndex + 1;
    
    if (nextIndex >= FLOW_SEQUENCE.length) {
      // Flow complete
      setCurrentStageIndex(-1);
      return;
    }
    
    const nextStage = FLOW_SEQUENCE[nextIndex];
    setCurrentStageIndex(nextIndex);
    onFlowStageChange?.(nextStage);
    
    if (nextStage === "complete") {
      // Show the response with typing animation
      setShowResponse(true);
    } else {
      // Show continue button after a delay
      continueDelayRef.current = setTimeout(() => {
        onContinueReady?.(true);
      }, 500);
    }
  };

  const startFlowAnimation = (response: string, promptTokens: number) => {
    setPendingResponse(response);
    setPendingTokens(promptTokens);
    setTokenHistory([...tokenHistory, promptTokens]);
    setShowResponse(false);
    setCurrentStageIndex(0);
    onFlowStageChange?.(FLOW_SEQUENCE[0]);
    
    // Show continue button after initial delay
    continueDelayRef.current = setTimeout(() => {
      onContinueReady?.(true);
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!input.trim() || currentFlowStage !== "idle" || isRequesting || sessionLocked) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    
    const currentInput = input.trim();
    setInput("");
    onInputChange?.("");

    setIsRequesting(true);
    // Pass full message array to worker (worker now handles messages directly)
    const result = await getResponseFromWorker(newMessages);
    setIsRequesting(false);

    // Check if content was flagged by moderation
    if (result.moderationFlagged) {
      // Remove the user message that was flagged
      onMessagesChange(messages);
      setShowModerationError(true);
      return;
    }

    const response = result.response ?? `Error: ${result.error || "Something went wrong."}`;
    const promptTokens = result.promptTokens || 0;

    // Start the flow animation with token count
    startFlowAnimation(response, promptTokens);
  };

  const handleResponseAnimationComplete = () => {
    // Add the assistant message to the messages array
    if (pendingResponse) {
      const assistantMessage: Message = { role: "assistant", content: pendingResponse };
      onMessagesChange([...messages, assistantMessage]);
      setPendingResponse(null);
      setPendingTokens(0);
      setShowResponse(false);
      setAnimatingMessageIndex(null);
      setCurrentStageIndex(-1);
      onFlowStageChange?.("idle");
    }
  };

  const handleNewConversation = () => {
    // Reset to just the system prompt (which is already in messages[0])
    const systemMessage = messages.find((m) => m.role === "system");
    onMessagesChange(systemMessage ? [systemMessage] : []);
    setTokenHistory([]);
    setInput("");
    onInputChange?.("");
    onFlowStageChange?.("idle");
  };

  // Filter out system messages for display
  const displayMessages = messages.filter((m) => m.role !== "system");
  const isProcessing = currentFlowStage !== "idle" && currentFlowStage !== "complete";
  const cumulativeTokens = tokenHistory.reduce((a, b) => a + b, 0);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 min-h-0">
        {displayMessages.length === 0 && !showResponse ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4">
              <span className="text-primary font-bold text-2xl">LLM</span>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Transparent LLM Demo
            </h2>
            <p className="text-muted-foreground max-w-md">
              Type a message to see how it flows through the system. Watch the pipeline animate step by step, then see the response type out. You have <strong>3 turns</strong> per conversation to ask questions.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["What is an LLM?", "What are tokens?", "How does attention work?"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    onInputChange?.(suggestion);
                  }}
                  className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 text-foreground rounded-full border border-border transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4">
            {displayMessages.map((message, index) => (
              <ChatMessage 
                key={index} 
                message={message}
                animate={animatingMessageIndex === index}
              />
            ))}
            
            {/* Show typing indicator while processing */}
            {isProcessing && !showResponse && (
              <div className="flex gap-4 py-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
                <div className="bg-secondary rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Processing through pipeline</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Animated response */}
            {showResponse && pendingResponse && (
              <>
                {pendingTokens > 0 && (
                  <div className="flex justify-center mb-2">
                    <div className="px-3 py-1 bg-green-500/15 border border-green-500/30 rounded text-xs text-green-600 dark:text-green-400 font-mono">
                      +{pendingTokens} tokens
                    </div>
                  </div>
                )}
                <ChatMessage
                  message={{ role: "assistant", content: pendingResponse }}
                  animate={true}
                  onAnimationComplete={handleResponseAnimationComplete}
                />
              </>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Session locked notice */}
      {sessionLocked && (
        <div className="border-t border-border p-3 bg-amber-500/10 border-t-amber-500/30 flex-shrink-0">
          <div className="text-center mb-2">
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
              Context window limit reached ({MAX_TURNS} turns)
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              This demo caps conversations at 3 user turns to simulate real context window limits.
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={handleNewConversation}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Start New Conversation
            </Button>
          </div>
        </div>
      )}

      {/* Input area with tokenization toggle */}
      {!sessionLocked && (
        <div className="border-t border-border p-2 bg-card flex-shrink-0">
          <TokenizedInput
            value={input}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            disabled={isProcessing || showResponse || isRequesting}
            placeholder={isProcessing || isRequesting ? "Processing..." : "Send a message..."}
          />
          {isProcessing && (
            <div className="mt-1 text-[10px] text-muted-foreground text-center">
              Click Continue to step through each stage of the pipeline
            </div>
          )}
          <div className="mt-1 text-[10px] text-muted-foreground text-center">
            Turn {userTurns} of {MAX_TURNS}
          </div>
        </div>
      )}

      <ModerationErrorModal
        isOpen={showModerationError}
        onClose={() => setShowModerationError(false)}
      />
    </div>
  );
}
