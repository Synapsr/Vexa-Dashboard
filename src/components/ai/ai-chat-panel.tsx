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
  }, [setMessages]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        sendMessage({
          parts: [{ type: "text" as const, text: input.trim() }],
        });
        setInput("");
      }
    },
    [input, isLoading, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          sendMessage({
            parts: [{ type: "text" as const, text: input.trim() }],
          });
          setInput("");
        }
      }
    },
    [input, isLoading, sendMessage]
  );

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

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
          ) : messages.length === 0 ? (
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
                      className="text-left text-sm px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
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

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-xs opacity-80">{error.message}</p>
            </div>
          </div>
        )}

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
