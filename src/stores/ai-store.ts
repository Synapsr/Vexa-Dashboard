import { create } from "zustand";
import { persist } from "zustand/middleware";

// Supported AI providers
export type AIProvider = "openai" | "anthropic" | "groq" | "openrouter" | "custom";

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  baseUrl: string;
  requiresApiKey: boolean;
  models: { id: string; name: string }[];
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini, and more",
    baseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    models: [
      { id: "gpt-4o", name: "GPT-4o (Recommended)" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini (Faster)" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5, Claude 3, and more",
    baseUrl: "https://api.anthropic.com/v1",
    requiresApiKey: true,
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 (Latest)" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku (Fast)" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference with Llama and Mixtral",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (Fastest)" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access multiple providers with one API key",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    models: [
      { id: "openai/gpt-4o", name: "GPT-4o" },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
      { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5" },
      { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B" },
    ],
  },
  {
    id: "custom",
    name: "Custom (OpenAI Compatible)",
    description: "Any OpenAI-compatible API (Ollama, LM Studio, etc.)",
    baseUrl: "",
    requiresApiKey: false,
    models: [
      { id: "custom", name: "Use model specified below" },
    ],
  },
];

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  customBaseUrl: string;
  customModel: string;
}

interface AIState {
  // Settings
  settings: AISettings;
  isConfigured: boolean;

  // Actions
  updateSettings: (settings: Partial<AISettings>) => void;
  clearSettings: () => void;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o-mini",
  customBaseUrl: "",
  customModel: "",
};

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: DEFAULT_SETTINGS,
      isConfigured: false,

      // Settings actions
      updateSettings: (newSettings: Partial<AISettings>) => {
        const currentSettings = get().settings;
        const updated = { ...currentSettings, ...newSettings };

        // Check if configured (has API key for providers that need it, or custom URL for custom)
        const provider = AI_PROVIDERS.find(p => p.id === updated.provider);
        const isConfigured = provider?.id === "custom"
          ? updated.customBaseUrl.length > 0
          : updated.apiKey.length > 0;

        set({ settings: updated, isConfigured });
      },

      clearSettings: () => {
        set({ settings: DEFAULT_SETTINGS, isConfigured: false });
      },
    }),
    {
      name: "vexa-ai-settings",
      partialize: (state) => ({
        settings: state.settings,
        isConfigured: state.isConfigured,
      }),
    }
  )
);
