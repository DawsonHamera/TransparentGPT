"use client";

import { useState, useEffect, useRef } from "react";
import {
  Monitor,
  Server,
  Cpu,
  Hash,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Braces,
  Cloud,
  Zap,
  ArrowRight,
  Play,
} from "lucide-react";
import { Message } from "@/lib/chat-data";
import { tokenize } from "@/lib/tokenizer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type FlowStage =
  | "idle"
  | "user-input"
  | "client-format"
  | "api-request"
  | "server-receive"
  | "tokenization"
  | "embedding"
  | "attention"
  | "generation"
  | "decode"
  | "response"
  | "complete";

interface AnimatedDataFlowProps {
  messages: Message[];
  currentInput: string;
  currentStage: FlowStage;
  pendingResponsePreview?: string | null;
  showContinue: boolean;
  onContinue: () => void;
  onSkip?: () => void;
}

interface StageConfig {
  id: FlowStage;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  description: string;
  side: "request" | "server" | "response";
}

const STAGES: StageConfig[] = [
  {
    id: "user-input",
    label: "User Input",
    icon: <Monitor className="h-5 w-5" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/50",
    glowColor: "shadow-blue-500/50",
    description: "Raw text from user",
    side: "request",
  },
  {
    id: "client-format",
    label: "Format Message",
    icon: <Braces className="h-5 w-5" />,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500/50",
    glowColor: "shadow-cyan-500/50",
    description: "Add role & metadata",
    side: "request",
  },
  {
    id: "api-request",
    label: "API Request",
    icon: <Cloud className="h-5 w-5" />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/50",
    glowColor: "shadow-emerald-500/50",
    description: "JSON to OpenAI",
    side: "request",
  },
  {
    id: "server-receive",
    label: "Server Receives",
    icon: <Server className="h-5 w-5" />,
    color: "text-lime-400",
    bgColor: "bg-lime-500/20",
    borderColor: "border-lime-500/50",
    glowColor: "shadow-lime-500/50",
    description: "Parse & validate",
    side: "server",
  },
  {
    id: "tokenization",
    label: "Tokenization",
    icon: <Hash className="h-5 w-5" />,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/50",
    glowColor: "shadow-yellow-500/50",
    description: "Text to token IDs",
    side: "server",
  },
  {
    id: "embedding",
    label: "Embedding",
    icon: <Zap className="h-5 w-5" />,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/50",
    glowColor: "shadow-orange-500/50",
    description: "Tokens to vectors",
    side: "server",
  },
  {
    id: "attention",
    label: "Attention Layers",
    icon: <Cpu className="h-5 w-5" />,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    borderColor: "border-pink-500/50",
    glowColor: "shadow-pink-500/50",
    description: "Process through transformer",
    side: "server",
  },
  {
    id: "generation",
    label: "Token Generation",
    icon: <Sparkles className="h-5 w-5" />,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/50",
    glowColor: "shadow-purple-500/50",
    description: "Predict next tokens",
    side: "server",
  },
  {
    id: "decode",
    label: "Decode Tokens",
    icon: <Hash className="h-5 w-5" />,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
    borderColor: "border-indigo-500/50",
    glowColor: "shadow-indigo-500/50",
    description: "IDs back to text",
    side: "response",
  },
  {
    id: "response",
    label: "Stream Response",
    icon: <Cloud className="h-5 w-5" />,
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
    borderColor: "border-teal-500/50",
    glowColor: "shadow-teal-500/50",
    description: "Send back to client",
    side: "response",
  },
];

const STAGE_ORDER: FlowStage[] = [
  "idle",
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

function getStageIndex(stage: FlowStage): number {
  return STAGE_ORDER.indexOf(stage);
}

function isStageActive(currentStage: FlowStage, stageId: FlowStage): boolean {
  return getStageIndex(currentStage) >= getStageIndex(stageId);
}

function isStageAnimating(currentStage: FlowStage, stageId: FlowStage): boolean {
  return currentStage === stageId;
}

export function AnimatedDataFlow({
  messages,
  currentInput,
  currentStage,
  pendingResponsePreview,
  showContinue,
  onContinue,
  onSkip,
}: AnimatedDataFlowProps) {
  const [expandedStage, setExpandedStage] = useState<FlowStage | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<Map<FlowStage, HTMLDivElement>>(new Map());

  const latestUserMessage = messages.filter((m) => m.role === "user").pop();
  const latestAssistantMessage = messages
    .filter((m) => m.role === "assistant")
    .pop();
  const displayInput =
    currentInput || latestUserMessage?.content || "Hello, how are you?";
  const inputTokens = tokenize(displayInput);

  // Auto-expand currently animating stage and scroll to it
  useEffect(() => {
    if (currentStage !== "idle" && currentStage !== "complete") {
      setExpandedStage(currentStage);
      
      // Scroll to the current stage
      const stageElement = stageRefs.current.get(currentStage);
      if (stageElement && scrollContainerRef.current) {
        setTimeout(() => {
          stageElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
      }
    }
  }, [currentStage]);

  const getStageData = (stageId: FlowStage): React.ReactNode => {
    switch (stageId) {
      case "user-input":
        return (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">Raw text string:</div>
            <div className="p-3 bg-secondary/80 rounded-lg font-mono text-xs break-all border border-blue-500/30">
              <span className="text-blue-400">&quot;</span>
              {displayInput}
              <span className="text-blue-400">&quot;</span>
            </div>
          </div>
        );

      case "client-format":
        return (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">Wrapped with role:</div>
            <pre className="p-3 bg-secondary/80 rounded-lg font-mono text-xs overflow-x-auto border border-cyan-500/30">
              <span className="text-cyan-400">{"{"}</span>{"\n"}
              {"  "}<span className="text-pink-400">&quot;role&quot;</span>: <span className="text-emerald-400">&quot;user&quot;</span>,{"\n"}
              {"  "}<span className="text-pink-400">&quot;content&quot;</span>: <span className="text-emerald-400">&quot;{displayInput.length > 40 ? displayInput.slice(0, 40) + "..." : displayInput}&quot;</span>{"\n"}
              <span className="text-cyan-400">{"}"}</span>
            </pre>
          </div>
        );

      case "api-request":
        // Build the actual messages array that will be sent
        const systemMsg = messages.find((m) => m.role === "system");
        const recentMessages = messages.filter(
          (m) => m.role !== "system" && (m.role === "user" || m.role === "assistant")
        );
        return (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">Full API payload (Groq):</div>
            <pre className="p-3 bg-secondary/80 rounded-lg font-mono text-xs overflow-x-auto max-h-40 border border-emerald-500/30">
              {JSON.stringify(
                {
                  model: "llama-3.1-8b-instant",
                  messages: [
                    ...(systemMsg ? [{ role: "system", content: systemMsg.content.slice(0, 50) + (systemMsg.content.length > 50 ? "..." : "") }] : []),
                    ...recentMessages.slice(-2).map((m) => ({
                      role: m.role,
                      content: m.content.slice(0, 35) + (m.content.length > 35 ? "..." : ""),
                    })),
                  ],
                  temperature: 0.7,
                  max_tokens: 200,
                },
                null,
                2
              )}
            </pre>
          </div>
        );

      case "server-receive":
        return (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">Server validates:</div>
            <div className="space-y-1.5 font-mono text-xs p-3 bg-secondary/80 rounded-lg border border-lime-500/30">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base">&#10003;</span>
                <span>API key valid</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base">&#10003;</span>
                <span>Rate limit OK</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base">&#10003;</span>
                <span>Model available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base">&#10003;</span>
                <span>Content policy passed</span>
              </div>
            </div>
          </div>
        );

      case "tokenization":
        return (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">
              Text to Token IDs (BPE algorithm):
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 bg-secondary/80 rounded-lg border border-yellow-500/30">
              {inputTokens.slice(0, 12).map((token, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-mono border",
                    token.color
                  )}
                >
                  {token.text === " " ? "␣" : token.text}
                  <span className="text-muted-foreground ml-1 opacity-70">
                    [{token.id}]
                  </span>
                </span>
              ))}
              {inputTokens.length > 12 && (
                <span className="text-muted-foreground text-xs self-center">+{inputTokens.length - 12} more</span>
              )}
            </div>
          </div>
        );

      case "embedding":
        return (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">
              Token IDs to 12,288-dimensional vectors:
            </div>
            <div className="font-mono text-xs space-y-2 p-3 bg-secondary/80 rounded-lg border border-orange-500/30">
              <div>
                <span className="text-orange-400">Token</span>{" "}
                <span className="text-cyan-400">&quot;{inputTokens[0]?.text || "Hello"}&quot;</span>{" "}
                <span className="text-muted-foreground">(ID: {inputTokens[0]?.id || 15496})</span>
              </div>
              <div className="text-muted-foreground pl-2 flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                <span className="truncate">[0.023, -0.156, 0.892, 0.445, -0.234, 0.667, ...]</span>
              </div>
              <div className="text-muted-foreground text-[10px] mt-1 border-t border-border pt-2">
                + positional encoding added for sequence position
              </div>
            </div>
          </div>
        );

      case "attention":
        return (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">
              96 layers with 96 attention heads each:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-secondary/80 rounded-lg border border-pink-500/30">
              <div className="p-2 bg-pink-500/10 rounded border border-pink-500/20">
                <div className="text-pink-400 font-semibold mb-1">Q x K^T</div>
                <div className="text-muted-foreground text-[10px]">Query-Key dot product</div>
              </div>
              <div className="p-2 bg-pink-500/10 rounded border border-pink-500/20">
                <div className="text-pink-400 font-semibold mb-1">Softmax</div>
                <div className="text-muted-foreground text-[10px]">Normalize attention</div>
              </div>
              <div className="p-2 bg-pink-500/10 rounded border border-pink-500/20">
                <div className="text-pink-400 font-semibold mb-1">x Values</div>
                <div className="text-muted-foreground text-[10px]">Weighted combination</div>
              </div>
              <div className="p-2 bg-pink-500/10 rounded border border-pink-500/20">
                <div className="text-pink-400 font-semibold mb-1">FFN</div>
                <div className="text-muted-foreground text-[10px]">Feed-forward network</div>
              </div>
            </div>
          </div>
        );

      case "generation":
        // Create realistic probability distribution based on input
        const hasQuestion = displayInput.includes("?");
        const hasGreeting = /hello|hi|hey|how are/i.test(displayInput);
        
        let topTokens: Array<{ text: string; prob: number }> = [];
        if (hasGreeting) {
          topTokens = [
            { text: "I'm", prob: 28.3 },
            { text: "Hello", prob: 22.1 },
            { text: "Hey", prob: 15.6 },
          ];
        } else if (hasQuestion) {
          topTokens = [
            { text: "I", prob: 31.2 },
            { text: "The", prob: 19.4 },
            { text: "To", prob: 11.7 },
          ];
        } else {
          topTokens = [
            { text: "The", prob: 26.8 },
            { text: "I", prob: 24.5 },
            { text: "To", prob: 13.2 },
          ];
        }

        return (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">
              Softmax over 100K+ vocabulary (llama-3.1 tokenizer):
            </div>
            <div className="space-y-1.5 font-mono text-xs p-3 bg-secondary/80 rounded-lg border border-purple-500/30">
              {topTokens.map((token, idx) => {
                const colors = ["emerald-400", "yellow-400", "orange-400"];
                const color = colors[idx % colors.length];
                return (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-purple-300">&quot;{token.text}&quot;</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full bg-${color} rounded-full`} style={{ width: `${token.prob}%` }} />
                      </div>
                      <span className={`text-${color} w-12 text-right`}>{token.prob}%</span>
                    </div>
                  </div>
                );
              })}
              <div className="text-muted-foreground text-[10px] mt-2 pt-2 border-t border-border">
                ⚡ Simulated probabilities based on input pattern • temperature=0.7
              </div>
            </div>
          </div>
        );

      case "decode":
        // Prefer in-flight pending response, then committed assistant message.
        const decodeSource =
          pendingResponsePreview ||
          latestAssistantMessage?.content ||
          latestUserMessage?.content ||
          displayInput;
        const responseTokens = tokenize((decodeSource || "").slice(0, 120));
        return (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">
              Output token IDs back to text:
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 bg-secondary/80 rounded-lg border border-indigo-500/30">
              {responseTokens.slice(0, 8).map((token, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-mono border",
                    token.color
                  )}
                >
                  {token.text === " " ? "␣" : token.text}
                </span>
              ))}
              {responseTokens.length > 8 && (
                <span className="text-muted-foreground text-xs self-center">...</span>
              )}
            </div>
          </div>
        );

      case "response":
        const streamSource =
          pendingResponsePreview || latestAssistantMessage?.content || "";
        const firstChunk = streamSource.slice(0, 10) || "Response";
        const secondChunk = streamSource.slice(10, 28) || " in progress";
        return (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">
              Streaming via Server-Sent Events:
            </div>
            <div className="font-mono text-xs p-3 bg-secondary/80 rounded-lg space-y-1 border border-teal-500/30">
              <div className="text-teal-400">
                data: {`{"choices":[{"delta":{"content":"${firstChunk}"}}]}`}
              </div>
              <div className="text-teal-400">
                data: {`{"choices":[{"delta":{"content":"${secondChunk}"}}]}`}
              </div>
              <div className="text-muted-foreground">...</div>
              <div className="text-teal-400">data: [DONE]</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const requestStages = STAGES.filter((s) => s.side === "request");
  const serverStages = STAGES.filter((s) => s.side === "server");
  const responseStages = STAGES.filter((s) => s.side === "response");

  const currentStageConfig = STAGES.find(s => s.id === currentStage);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="pb-4 border-b border-border mb-4">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Data Flow Pipeline
        </h2>
        <p className="text-sm text-muted-foreground">
          {currentStage === "idle"
            ? "Send a message to begin the visualization"
            : currentStage === "complete"
            ? "Flow complete - response delivered"
            : `Step: ${currentStageConfig?.label || "Processing"}`}
        </p>
      </div>

      {/* Continue Button - Sticky at top when visible */}
      {showContinue && (
         <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300 flex gap-2">
          <Button
            onClick={onContinue}
             className={cn(
               "flex-1 gap-2 text-base py-6 font-semibold transition-all",
              "bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90",
              "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            )}
          >
            <Play className="h-5 w-5" />
            Continue to Next Step
            <ArrowRight className="h-5 w-5" />
          </Button>
           <Button
             onClick={onSkip}
             variant="outline"
             className="px-4 py-6 font-semibold transition-all"
             title="Skip to end of flow"
           >
             Skip <ChevronDown className="h-4 w-4" />
           </Button>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin">
        {/* Request Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "w-3 h-3 rounded-full transition-all duration-500",
              isStageActive(currentStage, "user-input") ? "bg-blue-400 shadow-lg shadow-blue-400/50" : "bg-muted"
            )} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Client to Server
            </span>
            {isStageActive(currentStage, "user-input") && !isStageActive(currentStage, "server-receive") && (
              <ArrowRight className="h-4 w-4 text-blue-400 animate-pulse ml-auto" />
            )}
          </div>
          <div className="space-y-2">
            {requestStages.map((stage, idx) => (
              <StageNode
                key={stage.id}
                stage={stage}
                isActive={isStageActive(currentStage, stage.id)}
                isAnimating={isStageAnimating(currentStage, stage.id)}
                isExpanded={expandedStage === stage.id}
                onToggle={() =>
                  setExpandedStage(
                    expandedStage === stage.id ? null : stage.id
                  )
                }
                showArrow={idx < requestStages.length - 1}
                nodeRef={(el) => {
                  if (el) stageRefs.current.set(stage.id, el);
                }}
              >
                {getStageData(stage.id)}
              </StageNode>
            ))}
          </div>
        </div>

        {/* Animated connector to server */}
        <div className="flex justify-center py-2">
          <div className={cn(
            "flex flex-col items-center transition-all duration-500",
            isStageActive(currentStage, "server-receive") ? "opacity-100" : "opacity-30"
          )}>
            <div className={cn(
              "w-1 h-8 rounded-full transition-all duration-500",
              isStageAnimating(currentStage, "server-receive")
                ? "bg-gradient-to-b from-emerald-400 to-lime-400 shadow-lg shadow-lime-400/50 animate-pulse"
                : isStageActive(currentStage, "server-receive")
                ? "bg-gradient-to-b from-emerald-400/50 to-lime-400/50"
                : "bg-border"
            )} />
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
              isStageActive(currentStage, "server-receive")
                ? "bg-lime-500/20 border-2 border-lime-500/50 shadow-lg shadow-lime-500/25"
                : "bg-secondary border border-border"
            )}>
              <Server className={cn(
                "h-5 w-5 transition-colors",
                isStageActive(currentStage, "server-receive") ? "text-lime-400" : "text-muted-foreground"
              )} />
            </div>
            <div className={cn(
              "w-1 h-4 rounded-full transition-all duration-500",
              isStageActive(currentStage, "server-receive") ? "bg-lime-400/50" : "bg-border"
            )} />
          </div>
        </div>

        {/* Server Section */}
        <div className={cn(
          "rounded-xl p-4 transition-all duration-500 border-2",
          isStageActive(currentStage, "server-receive")
            ? "bg-card border-yellow-500/30 shadow-lg shadow-yellow-500/10"
            : "bg-card/50 border-border"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "w-3 h-3 rounded-full transition-all duration-500",
              isStageActive(currentStage, "server-receive") ? "bg-yellow-400 shadow-lg shadow-yellow-400/50" : "bg-muted"
            )} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Inside Groq Server
            </span>
            {isStageActive(currentStage, "server-receive") &&
              !isStageActive(currentStage, "decode") && (
                <span className="ml-auto text-xs text-yellow-400 animate-pulse flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  Processing
                </span>
              )}
          </div>
          <div className="space-y-2">
            {serverStages.map((stage, idx) => (
              <StageNode
                key={stage.id}
                stage={stage}
                isActive={isStageActive(currentStage, stage.id)}
                isAnimating={isStageAnimating(currentStage, stage.id)}
                isExpanded={expandedStage === stage.id}
                onToggle={() =>
                  setExpandedStage(
                    expandedStage === stage.id ? null : stage.id
                  )
                }
                showArrow={idx < serverStages.length - 1}
                nodeRef={(el) => {
                  if (el) stageRefs.current.set(stage.id, el);
                }}
              >
                {getStageData(stage.id)}
              </StageNode>
            ))}
          </div>
        </div>

        {/* Animated connector from server */}
        <div className="flex justify-center py-2">
          <div className={cn(
            "flex flex-col items-center transition-all duration-500",
            isStageActive(currentStage, "decode") ? "opacity-100" : "opacity-30"
          )}>
            <div className={cn(
              "w-1 h-4 rounded-full transition-all duration-500",
              isStageActive(currentStage, "decode") ? "bg-indigo-400/50" : "bg-border"
            )} />
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
              isStageActive(currentStage, "decode")
                ? "bg-indigo-500/20 border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/25"
                : "bg-secondary border border-border"
            )}>
              <Monitor className={cn(
                "h-5 w-5 transition-colors",
                isStageActive(currentStage, "decode") ? "text-indigo-400" : "text-muted-foreground"
              )} />
            </div>
            <div className={cn(
              "w-1 h-8 rounded-full transition-all duration-500",
              isStageAnimating(currentStage, "decode")
                ? "bg-gradient-to-b from-indigo-400 to-teal-400 shadow-lg shadow-teal-400/50 animate-pulse"
                : isStageActive(currentStage, "decode")
                ? "bg-gradient-to-b from-indigo-400/50 to-teal-400/50"
                : "bg-border"
            )} />
          </div>
        </div>

        {/* Response Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "w-3 h-3 rounded-full transition-all duration-500",
              isStageActive(currentStage, "decode") ? "bg-teal-400 shadow-lg shadow-teal-400/50" : "bg-muted"
            )} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Server to Client
            </span>
            {isStageActive(currentStage, "decode") && (
              <ArrowRight className="h-4 w-4 text-teal-400 animate-pulse ml-auto" />
            )}
          </div>
          <div className="space-y-2">
            {responseStages.map((stage, idx) => (
              <StageNode
                key={stage.id}
                stage={stage}
                isActive={isStageActive(currentStage, stage.id)}
                isAnimating={isStageAnimating(currentStage, stage.id)}
                isExpanded={expandedStage === stage.id}
                onToggle={() =>
                  setExpandedStage(
                    expandedStage === stage.id ? null : stage.id
                  )
                }
                showArrow={idx < responseStages.length - 1}
                nodeRef={(el) => {
                  if (el) stageRefs.current.set(stage.id, el);
                }}
              >
                {getStageData(stage.id)}
              </StageNode>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StageNodeProps {
  stage: StageConfig;
  isActive: boolean;
  isAnimating: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  showArrow: boolean;
  children: React.ReactNode;
  nodeRef?: (el: HTMLDivElement | null) => void;
}

function StageNode({
  stage,
  isActive,
  isAnimating,
  isExpanded,
  onToggle,
  showArrow,
  children,
  nodeRef,
}: StageNodeProps) {
  return (
    <div className="relative" ref={nodeRef}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-500 relative overflow-hidden",
          isActive
            ? cn(stage.bgColor, stage.borderColor)
            : "bg-secondary/30 border-border/50 opacity-50",
          isAnimating && cn("shadow-xl", stage.glowColor),
          isAnimating && "ring-2 ring-offset-2 ring-offset-background",
          isAnimating && stage.borderColor.replace("border-", "ring-")
        )}
      >
        {/* Animated background pulse */}
        {isAnimating && (
          <div className={cn(
            "absolute inset-0 animate-pulse opacity-20",
            stage.bgColor.replace("/20", "")
          )} />
        )}
        
        <div
          className={cn(
            "p-2 rounded-lg transition-all relative z-10",
            isActive ? stage.bgColor : "bg-secondary",
            isAnimating && "animate-bounce"
          )}
        >
          <span className={isActive ? stage.color : "text-muted-foreground"}>
            {stage.icon}
          </span>
        </div>
        <div className="flex-1 text-left relative z-10">
          <div
            className={cn(
              "font-semibold text-sm",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {stage.label}
          </div>
          <div className="text-xs text-muted-foreground">{stage.description}</div>
        </div>
        {isActive && (
          <div className="text-muted-foreground relative z-10">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        )}
        {isAnimating && (
          <div className="absolute -right-1 -top-1 z-20">
            <span className="relative flex h-4 w-4">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  stage.bgColor.replace("/20", "")
                )}
              />
              <span
                className={cn(
                  "relative inline-flex rounded-full h-4 w-4",
                  stage.bgColor.replace("/20", "")
                )}
              />
            </span>
          </div>
        )}
      </button>

      {/* Expanded content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-500",
          isExpanded && isActive ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
        )}
      >
        <div className={cn("p-4 rounded-lg border-2", stage.bgColor, stage.borderColor)}>
          {children}
        </div>
      </div>

      {/* Arrow to next stage */}
      {showArrow && (
        <div className="flex justify-center py-1.5">
          <div className={cn(
            "flex flex-col items-center gap-0.5"
          )}>
            <div
              className={cn(
                "w-0.5 h-3 rounded-full transition-all duration-500",
                isActive
                  ? cn(
                      "bg-gradient-to-b",
                      stage.color.replace("text-", "from-"),
                      "to-transparent"
                    )
                  : "bg-border/50"
              )}
            />
            <ArrowRight className={cn(
              "h-3 w-3 rotate-90 transition-all duration-500",
              isActive ? stage.color : "text-border"
            )} />
          </div>
        </div>
      )}
    </div>
  );
}
