"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ResizableTripSidebar } from "@/components/ResizableTripSidebar";
import { CopilotChat } from "@/components/CopilotChat";
import type { TripContext } from "@/lib/copilot/run-v2";
import type { OfferCard } from "@/lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function CopilotModal({ isOpen, onClose }: Props) {
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [offerCards, setOfferCards] = useState<OfferCard[]>([]);
  const [offerSummary, setOfferSummary] = useState<string>("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--color-bg)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg)] text-[var(--color-text)] transition-colors"
          aria-label="Закрыть Copilot"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-georama), sans-serif" }}>
          AI Travel Copilot
        </h1>
      </div>
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <aside className="shrink-0 h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg)] z-10">
          <ResizableTripSidebar
            tripContext={tripContext}
            offerCards={offerCards}
            offerSummary={offerSummary}
            onOfferCardsChange={setOfferCards}
          />
        </aside>
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <CopilotChat
            onTripContextChange={setTripContext}
            onOfferCardsChange={(cards, summary) => {
              setOfferCards(cards);
              setOfferSummary(summary ?? "");
            }}
            displayOfferCards={offerCards}
          />
        </div>
      </div>
    </div>
  );
}
