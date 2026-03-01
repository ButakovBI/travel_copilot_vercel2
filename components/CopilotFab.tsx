"use client";

import { MessageCircle } from "lucide-react";

export function CopilotFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-tbank-yellow hover:bg-tbank-yellow-hover shadow-lg flex items-center justify-center text-tbank-black transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-tbank-black focus:ring-offset-2"
      aria-label="Открыть AI Travel Copilot"
    >
      <MessageCircle className="w-7 h-7" />
    </button>
  );
}
