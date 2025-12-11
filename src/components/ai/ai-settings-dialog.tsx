"use client";

import { useState } from "react";
import {
  Settings2,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  Sparkles,
  Zap,
  Globe,
  Server,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAIStore, AI_PROVIDERS, type AIProvider } from "@/stores/ai-store";
import { cn } from "@/lib/utils";

// Provider icons
const PROVIDER_ICONS: Record<AIProvider, typeof Sparkles> = {
  openai: Sparkles,
  anthropic: Sparkles,
  groq: Zap,
  openrouter: Globe,
  custom: Server,
};

export function AISettingsDialog() {
  const { settings, updateSettings, isConfigured } = useAIStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [open, setOpen] = useState(false);

  const currentProvider = AI_PROVIDERS.find(p => p.id === settings.provider);
  const models = currentProvider?.models || [];

  const handleProviderChange = (provider: AIProvider) => {
    const providerConfig = AI_PROVIDERS.find(p => p.id === provider);
    const defaultModel = providerConfig?.models[0]?.id || "";
    updateSettings({
      provider,
      model: defaultModel,
      apiKey: settings.provider === provider ? settings.apiKey : "",
    });
  };

  const getProviderDocs = (provider: AIProvider) => {
    switch (provider) {
      case "openai": return "https://platform.openai.com/api-keys";
      case "anthropic": return "https://console.anthropic.com/settings/keys";
      case "groq": return "https://console.groq.com/keys";
      case "openrouter": return "https://openrouter.ai/settings/keys";
      default: return null;
    }
  };

  const ProviderIcon = PROVIDER_ICONS[settings.provider] || Settings2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
          {isConfigured && (
            <span className="h-2 w-2 rounded-full bg-green-500" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ProviderIcon className="h-4 w-4 text-primary" />
            </div>
            AI Settings
          </DialogTitle>
          <DialogDescription>
            Connect your AI provider to analyze meeting transcripts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Provider Selection - Card Style */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Provider</Label>
            <div className="grid grid-cols-2 gap-2">
              {AI_PROVIDERS.slice(0, 4).map(provider => {
                const Icon = PROVIDER_ICONS[provider.id];
                const isSelected = settings.provider === provider.id;
                return (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderChange(provider.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/20 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        isSelected && "text-primary"
                      )}>
                        {provider.name}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Custom Provider Option */}
            <button
              onClick={() => handleProviderChange("custom")}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                settings.provider === "custom"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/20 hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                settings.provider === "custom" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Server className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "font-medium text-sm",
                  settings.provider === "custom" && "text-primary"
                )}>
                  Custom / Local
                </p>
                <p className="text-xs text-muted-foreground">
                  Ollama, LM Studio, or any OpenAI-compatible API
                </p>
              </div>
              {settings.provider === "custom" ? (
                <Check className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          </div>

          <Separator />

          {/* Configuration Section */}
          <div className="space-y-4">
            {/* API Key */}
            {currentProvider?.requiresApiKey && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="apiKey" className="text-sm font-medium">
                    API Key
                  </Label>
                  {getProviderDocs(settings.provider) && (
                    <a
                      href={getProviderDocs(settings.provider)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Get key <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={settings.apiKey}
                    onChange={(e) => updateSettings({ apiKey: e.target.value })}
                    placeholder={`sk-...`}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Custom Base URL */}
            {settings.provider === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customBaseUrl" className="text-sm font-medium">
                  Base URL
                </Label>
                <Input
                  id="customBaseUrl"
                  value={settings.customBaseUrl}
                  onChange={(e) => updateSettings({ customBaseUrl: e.target.value })}
                  placeholder="http://localhost:11434/v1"
                  className="font-mono text-sm"
                />
              </div>
            )}

            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Model</Label>
              {settings.provider === "custom" ? (
                <Input
                  value={settings.customModel}
                  onChange={(e) => updateSettings({ customModel: e.target.value })}
                  placeholder="llama3.2:latest"
                  className="font-mono text-sm"
                />
              ) : (
                <Select
                  value={settings.model}
                  onValueChange={(v) => updateSettings({ model: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Security Note */}
          <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            Your API key is stored locally in your browser and is only sent directly to {currentProvider?.name || "your provider"}.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {/* Status indicator */}
          <div className="flex-1 flex items-center gap-2">
            {isConfigured ? (
              <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Ready
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {settings.provider === "custom" ? "Enter base URL" : "Enter API key"}
              </span>
            )}
          </div>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
