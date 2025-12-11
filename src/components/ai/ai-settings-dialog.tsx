"use client";

import { useState } from "react";
import { Settings2, Eye, EyeOff, Check, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAIStore, AI_PROVIDERS, type AIProvider } from "@/stores/ai-store";
import { cn } from "@/lib/utils";

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Settings2 className="h-4 w-4" />
          {isConfigured && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Settings</DialogTitle>
          <DialogDescription>
            Configure your AI provider to enable chat with your transcripts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={settings.provider}
              onValueChange={(v) => handleProviderChange(v as AIProvider)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map(provider => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex flex-col">
                      <span>{provider.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {provider.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          {currentProvider?.requiresApiKey && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="apiKey">API Key</Label>
                {getProviderDocs(settings.provider) && (
                  <a
                    href={getProviderDocs(settings.provider)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    Get API key <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => updateSettings({ apiKey: e.target.value })}
                  placeholder={`Enter your ${currentProvider?.name} API key`}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally in your browser and never sent to our servers.
              </p>
            </div>
          )}

          {/* Custom Base URL for Custom provider */}
          {settings.provider === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customBaseUrl">Base URL</Label>
              <Input
                id="customBaseUrl"
                value={settings.customBaseUrl}
                onChange={(e) => updateSettings({ customBaseUrl: e.target.value })}
                placeholder="http://localhost:11434/v1"
              />
              <p className="text-xs text-muted-foreground">
                Enter the base URL for your OpenAI-compatible API (e.g., Ollama, LM Studio)
              </p>
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Model</Label>
            {settings.provider === "custom" ? (
              <Input
                value={settings.customModel}
                onChange={(e) => updateSettings({ customModel: e.target.value })}
                placeholder="llama3.2:latest"
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

          {/* Status */}
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg text-sm",
            isConfigured ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-muted text-muted-foreground"
          )}>
            {isConfigured ? (
              <>
                <Check className="h-4 w-4" />
                Ready to chat
              </>
            ) : (
              <>
                <Settings2 className="h-4 w-4" />
                {settings.provider === "custom" ? "Enter a base URL to continue" : "Enter your API key to continue"}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
