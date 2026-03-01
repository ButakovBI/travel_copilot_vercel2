import OpenAI from "openai";
import { buildSystemPrompt } from "./prompt";
import { tools, runTool, parseToolCallResult } from "./tools";
import type { UserContext } from "../types";
import type { OfferCard } from "../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export type CopilotMessage = { role: "user" | "assistant" | "system"; content: string };

export type CopilotResponse = {
  text: string;
  offerCards: OfferCard[];
};

const FORBIDDEN_PHRASES = [
  "гарантирую",
  "гарантированно",
  "гарантия",
  "guarantee",
  "100%",
  "точно будет",
  "обещаю",
];

function safetyFilter(text: string): string {
  let out = text;
  for (const phrase of FORBIDDEN_PHRASES) {
    if (out.toLowerCase().includes(phrase.toLowerCase())) {
      out = out.replace(new RegExp(phrase, "gi"), "[проверьте условия на сайте]");
    }
  }
  return out;
}

export async function runCopilot(
  messages: CopilotMessage[],
  userContext: UserContext
): Promise<CopilotResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      text: "Сервис ИИ временно недоступен. Укажите OPENAI_API_KEY в настройках сервера или воспользуйтесь обычным поиском на главной странице.",
      offerCards: [],
    };
  }

  const systemPrompt = buildSystemPrompt(userContext);
  const allOfferCards: OfferCard[] = [];

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) =>
      m.role === "user"
        ? { role: "user" as const, content: m.content }
        : { role: "assistant" as const, content: m.content }
    ),
  ];

  let currentMessages = [...apiMessages];
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: currentMessages,
      tools,
      tool_choice: "auto",
      max_tokens: 1500,
    });

    const choice = completion.choices[0];
    if (!choice) {
      return {
        text: "Не удалось получить ответ. Попробуйте переформулировать запрос.",
        offerCards: allOfferCards,
      };
    }

    const msg = choice.message;
    const toolCalls = msg.tool_calls;

    if (!toolCalls?.length) {
      const text = msg.content ? safetyFilter(String(msg.content)) : "Готово.";
      return { text, offerCards: allOfferCards };
    }

    const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];
    for (const tc of toolCalls) {
      const name = tc.function?.name ?? "";
      const args = (() => {
        try {
          return JSON.parse(tc.function?.arguments ?? "{}") as Record<string, unknown>;
        } catch {
          return {};
        }
      })();
      const result = await runTool(name, args);
      if (result.offerCards?.length) allOfferCards.push(...result.offerCards);
      const content = parseToolCallResult(name, result);
      toolResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content,
      });
    }

    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: msg.content ?? null, tool_calls: toolCalls },
      ...toolResults,
    ];
    iterations++;
  }

  const lastAssistant = currentMessages.filter((m) => m.role === "assistant").pop();
  const text =
    lastAssistant && typeof lastAssistant.content === "string"
      ? safetyFilter(lastAssistant.content)
      : "Подобрал варианты выше. Выберите подходящий и перейдите к бронированию.";
  return { text, offerCards: allOfferCards };
}
