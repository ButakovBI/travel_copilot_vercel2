"use client";

import { Plane, Hotel, Train, Bus, MapPin, FileText, Globe } from "lucide-react";

const CATEGORIES = [
  { id: "avia", label: "Авиа", icon: Plane },
  { id: "hotels", label: "Отели", icon: Hotel },
  { id: "trains", label: "Поезда", icon: Train },
  { id: "tours", label: "Туры", icon: Globe },
  { id: "buses", label: "Автобусы", icon: Bus },
  { id: "excursions", label: "Экскурсии", icon: MapPin },
  { id: "orders", label: "Заказы", icon: FileText },
] as const;

export function Categories() {
  return (
    <section className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {CATEGORIES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className="flex flex-col items-center gap-2 min-w-[4.5rem] sm:min-w-[5rem] py-4 px-3 sm:py-5 sm:px-4 rounded-[16px] bg-white border border-[#E5E5E5] shadow-sm hover:shadow-md hover:border-[#FFDD2D]/40 hover:bg-[#FFFBEB] transition-all duration-200 text-[#333] group"
        >
          <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center bg-[#F5F5F5] text-[#333] group-hover:bg-[#FFDD2D]/20 transition-colors">
            <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
          </span>
          <span className="text-xs sm:text-sm font-medium">{label}</span>
        </button>
      ))}
    </section>
  );
}
