"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  Trash2,
  StopCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAIStore } from "@/stores/ai-store";
import { AISettingsDialog } from "./ai-settings-dialog";
import { cn } from "@/lib/utils";
import type { Meeting, TranscriptSegment } from "@/types/vexa";

interface AIChatPanelProps {
  meeting?: Meeting;
  transcripts?: TranscriptSegment[];
  trigger?: React.ReactNode;
}

function buildTranscriptContext(transcripts: TranscriptSegment[], meeting?: Meeting): string {
  if (!transcripts.length) {
    return "";
  }

  let context = "";

  if (meeting) {
    context += `Meeting: ${meeting.data?.title || meeting.platform_specific_id}\n`;
    context += `Platform: ${meeting.platform}\n`;
    if (meeting.data?.participants?.length) {
      context += `Participants: ${meeting.data.participants.join(", ")}\n`;
    }
    context += "\n---\n\n";
  }

  context += "TRANSCRIPT:\n\n";

  // Group by speaker for cleaner context
  let lastSpeaker = "";
  for (const segment of transcripts) {
    if (segment.speaker !== lastSpeaker) {
      context += `\n[${segment.speaker}]:\n`;
      lastSpeaker = segment.speaker;
    }
    context += `${segment.text} `;
  }

  return context.trim();
}

export function AIChatPanel({ meeting, transcripts = [], trigger }: AIChatPanelProps) {
  const { settings, isConfigured } = useAIStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Build context from transcripts
  const context = buildTranscriptContext(transcripts, meeting);

  // Memoize the transport to avoid recreation on every render
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/ai/chat",
      body: {
        context,
        settings: {
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model,
          customBaseUrl: settings.customBaseUrl,
          customModel: settings.customModel,
        },
      },
    });
  }, [context, settings]);

  const {
    messages,
    status,
    error,
    setMessages,
    sendMessage,
    stop,
    clearError,
  } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus textarea when opened
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const handleClear = useCallback(() => {
    setMessages([]);
    clearError();
  }, [setMessages, clearError]);

  const doSendMessage = useCallback((text: string) => {
    if (text.trim() && !isLoading) {
      clearError();
      sendMessage({
        parts: [{ type: "text" as const, text: text.trim() }],
      });
    }
  }, [isLoading, sendMessage, clearError]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      doSendMessage(input);
      setInput("");
    },
    [input, doSendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        doSendMessage(input);
        setInput("");
      }
    },
    [input, doSendMessage]
  );

  // Send suggested prompt immediately
  const handleSuggestedPrompt = useCallback((prompt: string) => {
    doSendMessage(prompt);
  }, [doSendMessage]);

  const suggestedPrompts = [
    "Summarize this meeting",
    "What were the main decisions?",
    "List all action items",
    "What topics were discussed?",
  ];

  // Get text content from message parts
  const getMessageContent = (message: typeof messages[0]): string => {
    // Handle parts array
    const parts = message.parts;
    if (Array.isArray(parts)) {
      return parts
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map(part => part.text)
        .join("");
    }
    return "";
  };

  // Get user-friendly error message
  const getErrorMessage = (err: Error): string => {
    const msg = err.message.toLowerCase();
    if (msg.includes("invalid api key") || msg.includes("incorrect api key") || msg.includes("401")) {
      return "Invalid API key. Please check your API key in settings.";
    }
    if (msg.includes("rate limit") || msg.includes("429")) {
      return "Rate limit exceeded. Please wait a moment and try again.";
    }
    if (msg.includes("insufficient") || msg.includes("quota")) {
      return "API quota exceeded. Please check your account balance.";
    }
    if (msg.includes("network") || msg.includes("fetch")) {
      return "Network error. Please check your connection.";
    }
    return err.message;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Ask AI
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Talk to AI
            </SheetTitle>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <AISettingsDialog />
            </div>
          </div>
          {meeting && (
            <p className="text-sm text-muted-foreground">
              Analyzing: {meeting.data?.title || meeting.platform_specific_id}
            </p>
          )}
        </SheetHeader>

        {/* Error Banner - Prominent at top */}
        {error && (
          <div className="mx-4 mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-destructive">Something went wrong</p>
                <p className="text-sm text-destructive/80 mt-1">
                  {getErrorMessage(error)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearError}
                className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="text-xs"
              >
                Dismiss
              </Button>
              <AISettingsDialog />
            </div>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {!isConfigured ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Configure AI Provider</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your API key to start chatting with your transcripts
              </p>
              <AISettingsDialog />
            </div>
          ) : messages.length === 0 && !error ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {transcripts.length > 0
                  ? `Ask questions about your transcript (${transcripts.length} segments)`
                  : "No transcript loaded. Start a meeting to get AI insights."}
              </p>
              {transcripts.length > 0 && (
                <div className="grid gap-2 w-full max-w-xs">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      disabled={isLoading}
                      className="text-left text-sm px-3 py-2 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className={cn(
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "user" ? "U" : "AI"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[85%]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {getMessageContent(message).split("\n").map((line, i) => (
                        <p key={i} className="mb-1 last:mb-0">
                          {line || <br />}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted">AI</AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-3 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        {isConfigured && (
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your transcript..."
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
                disabled={isLoading}
              />
              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={stop}
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" size="icon" disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
