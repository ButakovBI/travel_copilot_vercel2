"use client";

import { useState } from "react";
import { MapPin, Calendar, Users } from "lucide-react";

export function SearchBlock() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [when, setWhen] = useState("");
  const [passengers, setPassengers] = useState("1");

  return (
    <section className="w-full max-w-4xl mx-auto bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5]/50 focus-within:border-[#FFDD2D]/60 focus-within:bg-white transition-colors">
          <MapPin className="w-5 h-5 text-[#666] shrink-0" />
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Откуда"
            className="flex-1 min-w-0 bg-transparent outline-none text-[#333] placeholder:text-[#999] text-sm sm:text-base"
          />
        </div>
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5]/50 focus-within:border-[#FFDD2D]/60 focus-within:bg-white transition-colors">
          <MapPin className="w-5 h-5 text-[#666] shrink-0" />
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Куда"
            className="flex-1 min-w-0 bg-transparent outline-none text-[#333] placeholder:text-[#999] text-sm sm:text-base"
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5]/50 focus-within:border-[#FFDD2D]/60 focus-within:bg-white transition-colors w-full lg:w-40">
          <Calendar className="w-5 h-5 text-[#666] shrink-0" />
          <input
            type="text"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            placeholder="Когда"
            className="flex-1 min-w-0 bg-transparent outline-none text-[#333] placeholder:text-[#999] text-sm sm:text-base"
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5]/50 focus-within:border-[#FFDD2D]/60 focus-within:bg-white transition-colors w-full lg:w-36">
          <Users className="w-5 h-5 text-[#666] shrink-0" />
          <input
            type="text"
            value={passengers}
            onChange={(e) => setPassengers(e.target.value)}
            placeholder="Пассажиры"
            className="flex-1 min-w-0 bg-transparent outline-none text-[#333] placeholder:text-[#999] text-sm sm:text-base"
          />
        </div>
        <button
          type="button"
          className="w-full lg:w-auto px-8 py-3.5 rounded-xl bg-[#FFDD2D] hover:bg-[#FCC521] text-black font-semibold transition-colors shadow-sm hover:shadow-md shrink-0"
        >
          Найти
        </button>
      </div>
    </section>
  );
}
