"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Categories } from "@/components/Categories";
import { SearchBlock } from "@/components/SearchBlock";
import { CopilotModal } from "@/components/CopilotModal";
import { MessageCircle } from "lucide-react";

export default function HomePage() {
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <Header />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text)] tracking-tight mb-3 sm:mb-4">
            Ваше путешествие начинается здесь
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-text-secondary)]">
            Авиабилеты с кешбэком до 7% на карту Т-Банка
          </p>
        </div>

        <div className="w-full max-w-4xl mb-8 sm:mb-10">
          <Categories />
        </div>

        <div className="w-full max-w-4xl">
          <SearchBlock />
        </div>
      </main>

      <button
        type="button"
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-text)] font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        aria-label="Открыть AI Travel Copilot"
      >
        <MessageCircle className="w-5 h-5" />
        <span>AI Travel Copilot</span>
      </button>

      <CopilotModal isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}
