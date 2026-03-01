import OpenAI from "openai";

const PROVIDER = (process.env.LLM_PROVIDER ?? "openrouter").toLowerCase();
const DEEPSEEK_BASE = "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
const QWEN_BASE = process.env.QWEN_API_BASE ?? "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = process.env.QWEN_MODEL ?? "qwen-turbo";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "arcee-ai/trinity-large-preview:free";

function getKey(raw: string | undefined): string | null {
  const v = raw?.trim();
  return v && v.length > 0 ? v : null;
}

function getConfig(): { apiKey: string; baseURL: string; model: string } {
  if (PROVIDER === "openrouter") {
    const key = getKey(process.env.OPENROUTER_API_KEY);
    if (!key) throw new Error("OPENROUTER_API_KEY не задан");
    return { apiKey: key, baseURL: OPENROUTER_BASE, model: OPENROUTER_MODEL };
  }
  if (PROVIDER === "qwen") {
    const key = getKey(process.env.QWEN_API_KEY) ?? getKey(process.env.DASHSCOPE_API_KEY);
    if (!key) throw new Error("QWEN_API_KEY или DASHSCOPE_API_KEY не задан");
    return { apiKey: key, baseURL: QWEN_BASE, model: QWEN_MODEL };
  }
  const key = getKey(process.env.DEEPSEEK_API_KEY) ?? getKey(process.env.OPENAI_API_KEY);
  if (!key) throw new Error("DEEPSEEK_API_KEY или OPENAI_API_KEY не задан");
  return { apiKey: key, baseURL: DEEPSEEK_BASE, model: DEEPSEEK_MODEL };
}

export function createLlmClient(): OpenAI {
  const { apiKey, baseURL, model } = getConfig();
  return new OpenAI({ apiKey, baseURL });
}

export function getLlmModel(): string {
  try {
    return getConfig().model;
  } catch {
    return OPENROUTER_MODEL;
  }
}

export function isLlmConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}
