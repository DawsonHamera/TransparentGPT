"use client";

import { useState, useEffect, useRef } from "react";
import { User, Bot } from "lucide-react";
import { Message } from "@/lib/chat-data";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  animate?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
}

export function ChatMessage({ 
  message, 
  animate = false, 
  onAnimationComplete,
  className 
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [displayedContent, setDisplayedContent] = useState(animate ? "" : message.content);
  const [isAnimating, setIsAnimating] = useState(animate);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!animate) {
      setDisplayedContent(message.content);
      return;
    }

    setIsAnimating(true);
    setDisplayedContent("");
    
    let currentIndex = 0;
    const content = message.content;
    
    // Variable speed - faster for spaces and common chars
    const getDelay = (char: string) => {
      if (char === " ") return 10;
      if (char === "\n") return 50;
      if (/[.,!?]/.test(char)) return 80;
      return 20 + Math.random() * 15;
    };

    const animateNext = () => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        currentIndex++;
        animationRef.current = setTimeout(animateNext, getDelay(content[currentIndex - 1]));
      } else {
        setIsAnimating(false);
        onAnimationComplete?.();
      }
    };

    animationRef.current = setTimeout(animateNext, 100);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [animate, message.content, onAnimationComplete]);

  // Parse markdown-style formatting in text
  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Match **bold** patterns
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      // Add the bold text
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };

  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let isInList = false;
    
    lines.forEach((line, i) => {
      // Check for list items
      const bulletMatch = line.match(/^[-•]\s+(.+)/);
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
      
      if (bulletMatch) {
        if (!isInList) {
          isInList = true;
          listItems = [];
        }
        listItems.push(
          <li key={`li-${i}`} className="ml-1">
            {parseInlineMarkdown(bulletMatch[1])}
          </li>
        );
      } else if (numberedMatch) {
        if (!isInList) {
          isInList = true;
          listItems = [];
        }
        listItems.push(
          <li key={`li-${i}`} className="ml-1">
            {parseInlineMarkdown(numberedMatch[2])}
          </li>
        );
      } else {
        // Not a list item - flush any pending list
        if (isInList && listItems.length > 0) {
          elements.push(
            <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2">
              {listItems}
            </ul>
          );
          listItems = [];
          isInList = false;
        }
        
        // Handle empty lines
        if (line.trim() === "") {
          elements.push(<br key={`br-${i}`} />);
        } else {
          // Regular paragraph with inline markdown
          elements.push(
            <p key={`p-${i}`} className="my-1">
              {parseInlineMarkdown(line)}
            </p>
          );
        }
      }
    });
    
    // Flush any remaining list items
    if (isInList && listItems.length > 0) {
      elements.push(
        <ul key="ul-final" className="list-disc list-inside space-y-1 my-2">
          {listItems}
        </ul>
      );
    }
    
    return elements;
  };

  return (
    <div
      className={cn(
        "flex gap-4 py-4",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        <div className="text-sm leading-relaxed">
          {renderContent(displayedContent)}
          {isAnimating && (
            <span className="inline-block w-2 h-4 bg-current ml-0.5 animate-pulse" />
          )}
        </div>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <User className="h-4 w-4 text-blue-400" />
        </div>
      )}
    </div>
  );
}
