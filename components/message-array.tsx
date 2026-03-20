"use client";

import { Message } from "@/lib/chat-data";
import { cn } from "@/lib/utils";

interface MessageArrayProps {
  messages: Message[];
  className?: string;
}

const ROLE_COLORS = {
  system: "text-amber-400",
  user: "text-blue-400",
  assistant: "text-emerald-400",
};

export function MessageArray({ messages, className }: MessageArrayProps) {
  return (
    <div className={cn("font-mono text-sm", className)}>
      <div className="text-muted-foreground mb-2">{"// API Request Body"}</div>
      <div className="text-foreground">{"{"}</div>
      <div className="pl-4">
        <span className="text-pink-400">{'"model"'}</span>
        <span className="text-foreground">: </span>
        <span className="text-emerald-400">{'"gpt-4"'}</span>
        <span className="text-foreground">,</span>
      </div>
      <div className="pl-4">
        <span className="text-pink-400">{'"messages"'}</span>
        <span className="text-foreground">: [</span>
      </div>
      {messages.map((message, index) => (
        <div key={index} className="pl-8">
          <span className="text-foreground">{"{"}</span>
          <div className="pl-4">
            <span className="text-pink-400">{'"role"'}</span>
            <span className="text-foreground">: </span>
            <span className={ROLE_COLORS[message.role]}>
              {'"'}
              {message.role}
              {'"'}
            </span>
            <span className="text-foreground">,</span>
          </div>
          <div className="pl-4">
            <span className="text-pink-400">{'"content"'}</span>
            <span className="text-foreground">: </span>
            <span className="text-emerald-400 break-all">
              {'"'}
              {message.content.length > 100
                ? message.content.substring(0, 100) + "..."
                : message.content.replace(/\n/g, "\\n")}
              {'"'}
            </span>
          </div>
          <span className="text-foreground">{"}"}</span>
          {index < messages.length - 1 && (
            <span className="text-foreground">,</span>
          )}
        </div>
      ))}
      <div className="pl-4">
        <span className="text-foreground">]</span>
      </div>
      <div className="text-foreground">{"}"}</div>
    </div>
  );
}
