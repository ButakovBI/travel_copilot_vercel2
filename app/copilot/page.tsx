"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { Header } from "@/components/Header";
import { ResizableTripSidebar } from "@/components/ResizableTripSidebar";
import { CopilotChat } from "@/components/CopilotChat";
import type { TripContext } from "@/lib/copilot/run-v2";
import type { OfferCard } from "@/lib/types";

export default function CopilotPage() {
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [offerCards, setOfferCards] = useState<OfferCard[]>([]);
  const [offerSummary, setOfferSummary] = useState<string>("");

  return (
    <div className="h-screen flex flex-col bg-[#F5F5F5] overflow-hidden">
      <Header />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <aside className="shrink-0 h-full overflow-y-auto sticky top-0 self-start border-r border-[#E5E5E5] bg-[#F8FAFC] z-10">
          <ResizableTripSidebar
            tripContext={tripContext}
            offerCards={offerCards}
            offerSummary={offerSummary}
            onOfferCardsChange={setOfferCards}
          />
        </aside>
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E5E5] bg-white shrink-0">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-[#F5F5F5] text-[#333] transition-colors"
              aria-label="На главную"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold text-black">T-Travel Copilot</h1>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
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
      <Link
        href="/"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#FFDD2D] hover:bg-[#FCC521] text-black shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
        aria-label="Выйти из Copilot"
        title="Выйти из Copilot"
      >
        <X className="w-6 h-6" />
      </Link>
    </div>
  );
}
