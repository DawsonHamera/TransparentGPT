"use client";

import { useEffect, useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SystemPromptPanel } from "@/components/system-prompt-panel";
import { ChatInterface } from "@/components/chat-interface";
import { AnimatedDataFlow, FlowStage } from "@/components/animated-data-flow";
import { DEFAULT_SYSTEM_PROMPT, Message } from "@/lib/chat-data";
import {
  checkWorkerAccessibility,
  WorkerAccessibilityStatus,
  isWorkerConfigured,
} from "@/lib/worker-api";
import { cn } from "@/lib/utils";

export default function Home() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [systemPromptVisible, setSystemPromptVisible] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: DEFAULT_SYSTEM_PROMPT },
  ]);
  const [tokenHistory, setTokenHistory] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [flowStage, setFlowStage] = useState<FlowStage>("idle");
  const [showContinue, setShowContinue] = useState(false);
  const [continueClicked, setContinueClicked] = useState(false);
  const [skipClicked, setSkipClicked] = useState(false);
  const [pendingResponsePreview, setPendingResponsePreview] = useState<string | null>(null);
  const [workerStatus, setWorkerStatus] =
    useState<WorkerAccessibilityStatus>("checking");

  // Handle system prompt change
  const handleSystemPromptChange = (newPrompt: string) => {
    setSystemPrompt(newPrompt);
    setMessages((prev) => [{ role: "system", content: newPrompt }, ...prev.slice(1)]);
  };

  // Handle messages change
  const handleMessagesChange = (newMessages: Message[]) => {
    setMessages(newMessages);
  };

  // Handle continue button in data flow
  const handleContinue = () => {
    setShowContinue(false);
    setContinueClicked(true);
  };

  // Called by ChatInterface when continue has been processed
  const handleContinueHandled = () => {
    setContinueClicked(false);
  };

  const handleSkipHandled = () => {
    setSkipClicked(false);
  };

  // Called by ChatInterface when ready to show continue
  const handleContinueReady = (ready: boolean) => {
    setShowContinue(ready);
  };

  // Compute context window stats
  const userTurns = messages.filter((m) => m.role === "user").length;
  const cumulativeTokens = tokenHistory.reduce((a, b) => a + b, 0);

  const isProcessing = flowStage !== "idle" && flowStage !== "complete";

  useEffect(() => {
    let cancelled = false;

    const refreshStatus = async () => {
      if (!isWorkerConfigured()) {
        if (!cancelled) setWorkerStatus("not-configured");
        return;
      }

      if (!cancelled) setWorkerStatus("checking");
      const status = await checkWorkerAccessibility();
      if (!cancelled) setWorkerStatus(status);
    };

    refreshStatus();
    const intervalId = setInterval(refreshStatus, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const workerStatusStyle: Record<
    WorkerAccessibilityStatus,
    { label: string; dotClass: string; badgeClass: string }
  > = {
    checking: {
      label: "AI Model: checking",
      dotClass: "bg-amber-400",
      badgeClass: "border-amber-500/30 text-amber-500 bg-amber-500/10",
    },
    online: {
      label: "AI Model: online",
      dotClass: "bg-emerald-400",
      badgeClass: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
    },
    offline: {
      label: "AI Model: offline",
      dotClass: "bg-red-400",
      badgeClass: "border-red-500/30 text-red-500 bg-red-500/10",
    },
    "not-configured": {
      label: "AI Model: not configured",
      dotClass: "bg-muted-foreground",
      badgeClass:
        "border-muted-foreground/30 text-muted-foreground bg-muted-foreground/10",
    },
  };

  const statusUi = workerStatusStyle[workerStatus];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header - compact */}
      <header className="border-b border-border bg-card px-3 py-2 flex-shrink-0">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Zap className="h-3 w-3 text-primary" />
              </div>
              <h1 className="text-base font-bold text-foreground hidden sm:block">
                Transparent <span className="text-primary">GPT</span>
              </h1>
            </div>
            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-secondary rounded-full hidden md:inline">
              Educational Demo
            </span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full border hidden sm:inline-flex items-center gap-1.5",
                statusUi.badgeClass
              )}
              title="Checks worker accessibility every 30 seconds"
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", statusUi.dotClass)} />
              {statusUi.label}
            </span>
            {isProcessing && (
              <span className="text-[10px] text-primary px-1.5 py-0.5 bg-primary/10 rounded-full border border-primary/30 animate-pulse hidden sm:inline">
                {flowStage.replace(/-/g, " ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden h-7 w-7"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="h-3 w-3" />
              ) : (
                <Menu className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Chat Section */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* System Prompt - compact */}
          <div className="border-b border-border p-2 flex-shrink-0">
            <SystemPromptPanel
              systemPrompt={systemPrompt}
              onSystemPromptChange={handleSystemPromptChange}
              isVisible={systemPromptVisible}
              onToggleVisibility={() => setSystemPromptVisible(!systemPromptVisible)}
              cumulativeTokens={cumulativeTokens}
              userTurns={userTurns}
            />
          </div>

          {/* Chat Interface - scrollable */}
          <ChatInterface
            messages={messages}
            onMessagesChange={handleMessagesChange}
            onInputChange={setCurrentInput}
            onFlowStageChange={setFlowStage}
            onContinueReady={handleContinueReady}
            onTokenHistoryChange={setTokenHistory}
            onPendingResponseChange={setPendingResponsePreview}
            currentFlowStage={flowStage}
            continueClicked={continueClicked}
            skipClicked={skipClicked}
            onContinueHandled={handleContinueHandled}
            onSkipHandled={handleSkipHandled}
            systemPrompt={systemPrompt}
            className="flex-1 min-h-0 overflow-hidden"
          />
        </div>

        {/* Data Flow Sidebar */}
        <aside
          className={cn(
            "border-l border-border bg-card transition-all duration-300 flex flex-col",
            sidebarOpen ? "w-full lg:w-[380px]" : "w-0 overflow-hidden",
            "fixed lg:relative inset-y-0 right-0 top-[41px] lg:top-0 z-40 lg:z-0"
          )}
        >
          <div className="flex-1 p-3 overflow-y-auto min-h-0">
            <AnimatedDataFlow
              messages={messages}
              currentInput={currentInput}
              currentStage={flowStage}
              pendingResponsePreview={pendingResponsePreview}
              showContinue={showContinue}
              onContinue={handleContinue}
              onSkip={() => {
                setShowContinue(false);
                setSkipClicked(true);
              }}
            />
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
