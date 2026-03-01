"use client";

import type { OfferCard, RouteLabel } from "@/lib/types";
import type { MultiLegData } from "@/lib/types";
import { getDestinationImageUrl } from "@/lib/destination-image";
import { Plane, Hotel, Train, MapPin, Check, Share2 } from "lucide-react";

/* Картинка только если есть реальный URL (без плейсхолдеров). */
function CardImage({ src, alt }: { src?: string | null; alt?: string }) {
  if (!src || !src.startsWith("http")) return null;
  return <img src={src} alt={alt ?? ""} className="w-full h-32 object-cover" />;
}

function FlightCard({ data }: { data: OfferCard & { type: "flight" } }) {
  const d = data.data;
  return (
    <div className="rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.06)] transition-all duration-[var(--duration-normal)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] hover:-translate-y-0.5">
      <CardImage src={d.imageUrl} />
      <div className="p-4">
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm mb-2">
          <Plane className="w-4 h-4 text-[var(--color-primary)]" />
          <span>Рейс</span>
        </div>
        <div className="font-medium text-[var(--color-text)]">{d.origin} → {d.destination}</div>
        <div className="text-sm text-[var(--color-text-secondary)] mt-1">{d.carrier} {d.flightNumber} · {d.direct ? "прямой" : "с пересадкой"}</div>
        <div className="text-sm mt-1">Вылет {d.departureAt}, прилёт {d.arrivalAt}</div>
        <div className="mt-3 text-lg font-semibold text-[var(--color-text)]">{d.priceRub.toLocaleString("ru-RU")} ₽</div>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Данные от Duffel. Условия уточняйте при бронировании.</p>
      </div>
    </div>
  );
}

function HotelCard({ data }: { data: OfferCard & { type: "hotel" } }) {
  const d = data.data;
  return (
    <div className="rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.06)] transition-all duration-[var(--duration-normal)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] hover:-translate-y-0.5">
      <CardImage src={d.imageUrl} alt={`${d.name} ${d.city}`} />
      <div className="p-4">
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm mb-2">
          <Hotel className="w-4 h-4 text-[var(--color-primary)]" />
          <span>Отель</span>
        </div>
        <div className="font-medium text-[var(--color-text)]">{d.name}, {d.city}</div>
        <div className="text-sm text-[var(--color-text-secondary)] mt-1">{d.stars}★ · {d.amenities}</div>
        <div className="mt-3 text-lg font-semibold text-[var(--color-text)]">{d.pricePerNightRub.toLocaleString("ru-RU")} ₽ / ночь</div>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Условия уточняйте при бронировании.</p>
      </div>
    </div>
  );
}

function TrainCard({ data }: { data: OfferCard & { type: "train" } }) {
  const d = data.data;
  return (
    <div className="rounded-[var(--radius-lg)] p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm mb-2">
        <Train className="w-4 h-4 text-[var(--color-primary)]" />
        <span>Поезд</span>
      </div>
      <div className="font-medium text-[var(--color-text)]">{d.origin} → {d.destination}</div>
      <div className="text-sm text-[var(--color-text-secondary)] mt-1">{d.carrier}</div>
      <div className="text-sm mt-1">Отправление {d.departureAt}, прибытие {d.arrivalAt}</div>
      <div className="mt-3 text-lg font-semibold text-[var(--color-text)]">{d.priceRub.toLocaleString("ru-RU")} ₽</div>
      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Цена и наличие — по данным перевозчика.</p>
    </div>
  );
}

function multiLegTotal(data: MultiLegData): number {
  const transport = data.legs.reduce((s, l) => s + l.offer.priceRub, 0) + (data.returnLeg ? data.returnLeg.offer.priceRub : 0);
  const hotels = (data.hotels ?? []).reduce((s, h) => s + h.offer.pricePerNightRub, 0);
  return transport + hotels;
}

type CardMeta = OfferCard & { routeLabel?: RouteLabel; riskScore?: number; riskFactors?: string[] };
type MultiLegCardMeta = CardMeta & { type: "multiLeg" };

function BundleCard({ card }: { card: CardMeta & { type: "bundle" } }) {
  const { flights, hotels, totalRub, routeLabel } = card;
  const firstHotel = hotels[0];
  const firstFlight = flights[0];

  const destinationCity = firstFlight?.destination ?? firstHotel?.city;
  const destinationImageUrl = getDestinationImageUrl(destinationCity);

  return (
    <div className="rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.06)] transition-all duration-[var(--duration-normal)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] hover:-translate-y-0.5">
      <CardImage src={destinationImageUrl} alt={destinationCity ? `${destinationCity} — направление` : "Маршрут"} />
      <div className="p-4 bg-[var(--color-bg)]/90 border-b border-[var(--color-border)]">
        {routeLabel && (
          <span className="shrink-0 text-[10px] font-medium px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/30 text-[var(--color-text)] inline-block mb-3">
            {routeLabel}
          </span>
        )}
        <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Маршрут</p>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-base font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-georama), sans-serif" }}>
          {firstFlight && (
            <>
              <span>{firstFlight.origin}</span>
              <span className="text-[var(--color-primary)] mx-0.5">→</span>
              <Plane className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <span className="text-[var(--color-primary)] mx-0.5">→</span>
              <span>{firstFlight.destination}</span>
            </>
          )}
          {firstHotel && (
            <>
              <span className="text-[var(--color-text-tertiary)] mx-1">·</span>
              <Hotel className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <span className="ml-0.5">{firstHotel.name}, {firstHotel.city}</span>
            </>
          )}
        </div>
      </div>
      <div className="p-4 space-y-2">
        {flights.map((f) => (
          <div key={f.id} className="text-sm border-l-[3px] border-[var(--color-accent)] pl-3">
            <span className="font-medium">{f.origin} → {f.destination}</span>
            <span className="text-[var(--color-text-secondary)]"> · {f.carrier}</span>
            {f.direct && <span className="text-[var(--color-text-secondary)]"> · прямой</span>}
            <span> · {f.priceRub.toLocaleString("ru-RU")} ₽</span>
          </div>
        ))}
        {hotels.length > 0 && (
          <div className="pt-2 border-t border-[var(--color-border)]">
            <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">Отель</div>
            {hotels.map((h) => (
              <div key={h.id} className="text-sm flex items-center gap-2 py-1">
                <Hotel className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span className="font-medium">{h.name}</span>
                <span className="text-[var(--color-text-secondary)]">{h.city}</span>
                <span>{h.stars}★</span>
                <span>{h.pricePerNightRub.toLocaleString("ru-RU")} ₽/ночь</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-lg font-semibold text-[var(--color-text)]">Итого: {totalRub.toLocaleString("ru-RU")} ₽</span>
        </div>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Данные о перелётах от Duffel. Условия уточняйте при бронировании.</p>
      </div>
    </div>
  );
}

function MultiLegCard({ card }: { card: MultiLegCardMeta }) {
  const { legs, returnLeg, hotels } = card.data;
  const total = multiLegTotal(card.data);
  const firstHotelImage = hotels?.[0]?.offer?.imageUrl;
  const lastCity = legs?.length ? legs[legs.length - 1].to : returnLeg?.to;
  const destinationImageUrl = getDestinationImageUrl(lastCity) || firstHotelImage;
  const riskScore = card.riskScore ?? 0;
  const riskFactors = card.riskFactors ?? [];
  const isRisky = riskScore >= 6;
  const isPlaceholder = (leg: { offer: { carrier: string } }) => leg.offer.carrier === "—";

  return (
    <div className="rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.06)] transition-all duration-[var(--duration-normal)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] hover:-translate-y-0.5">
      <CardImage src={destinationImageUrl} alt={lastCity ? `${lastCity} — направление` : "Маршрут"} />
      <div className="p-4 bg-[var(--color-bg)]/90 border-b border-[var(--color-border)]">
        {card.routeLabel && (
          <span className="shrink-0 text-[10px] font-medium px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/30 text-[var(--color-text)] inline-block mb-3">
            {card.routeLabel}
          </span>
        )}
        <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Маршрут</p>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-base font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-georama), sans-serif" }}>
          {legs.map((l, i) => (
            <span key={i} className="flex items-center gap-1 flex-wrap">
              <span className={isPlaceholder(l) ? "text-[var(--color-caution)]" : ""}>{l.from}</span>
              <span className="text-[var(--color-primary)] mx-0.5">→</span>
              <Plane className={`w-4 h-4 shrink-0 ${isPlaceholder(l) ? "text-[var(--color-caution)]" : "text-[var(--color-primary)]"}`} />
              <span className="text-[var(--color-primary)] mx-0.5">→</span>
              <span className={isPlaceholder(l) ? "text-[var(--color-caution)]" : ""}>{l.to}</span>
              {hotels?.some((h) => h.city === l.to) && (
                <>
                  <span className="text-[var(--color-text-tertiary)] mx-0.5">·</span>
                  <Hotel className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
                  <span className="text-[var(--color-text-secondary)]">{l.to}</span>
                </>
              )}
              {i < legs.length - 1 || returnLeg ? <span className="text-[var(--color-primary)] mx-0.5">→</span> : null}
            </span>
          ))}
          {returnLeg && (
            <>
              <span className={isPlaceholder(returnLeg) ? "text-[var(--color-caution)]" : ""}>{returnLeg.from}</span>
              <span className="text-[var(--color-primary)] mx-0.5">→</span>
              <Plane className={`w-4 h-4 shrink-0 ${isPlaceholder(returnLeg) ? "text-[var(--color-caution)]" : "text-[var(--color-primary)]"}`} />
              <span className="text-[var(--color-primary)] mx-0.5">→</span>
              <span className={isPlaceholder(returnLeg) ? "text-[var(--color-caution)]" : ""}>{returnLeg.to}</span>
            </>
          )}
        </div>
        {(riskScore > 0 || riskFactors.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {riskScore > 0 && (
              <span className={`text-xs ${isRisky ? "text-[var(--color-risk)]" : "text-[var(--color-text-secondary)]"}`}>
                Риск: {riskScore}/10
              </span>
            )}
            {riskFactors[0] && riskFactors[0] !== "Без особых рисков" && (
              <span className="text-xs text-[var(--color-text-secondary)]">{riskFactors[0]}</span>
            )}
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        {legs.map((l, i) => (
          <div key={i} className="text-sm border-l-[3px] border-[var(--color-accent)] pl-3">
            <span className="font-medium">{l.from} → {l.to}</span>
            <span className="text-[var(--color-text-secondary)]"> · {l.offer.carrier}</span>
            {l.offer.priceRub > 0 && <span> · {l.offer.priceRub.toLocaleString("ru-RU")} ₽</span>}
          </div>
        ))}
        {returnLeg && (
          <div className="text-sm border-l-2 border-[var(--color-border)] pl-3">
            <span className="font-medium">Обратно: {returnLeg.from} → {returnLeg.to}</span>
            <span className="text-[var(--color-text-secondary)]"> · {returnLeg.offer.carrier}</span>
            {returnLeg.offer.priceRub > 0 && <span> · {returnLeg.offer.priceRub.toLocaleString("ru-RU")} ₽</span>}
          </div>
        )}
        {hotels && hotels.length > 0 && (
          <>
            <div className="pt-2 border-t border-[var(--color-border)]">
              <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Подробное описание</div>
              <p className="text-sm text-[var(--color-text)] mb-2">
                {hotels.map((h, i) => (
                  <span key={i}>
                    {i > 0 && " "}
                    <strong>{h.city}</strong>: {h.offer.name}
                    {h.offer.stars ? `, ${h.offer.stars}★` : ""}
                    {i < hotels.length - 1 ? "." : ""}
                  </span>
                ))}
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--color-border)]">
              <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">Отели по маршруту</div>
              {hotels.map((h, i) => (
                <div key={i} className="text-sm flex items-center gap-2 py-1">
                  <Hotel className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  <span className="font-medium">{h.offer.name}</span>
                  <span className="text-[var(--color-text-secondary)]">{h.city}</span>
                  {h.offer.stars ? <span>{h.offer.stars}★</span> : null}
                  <span>{h.offer.pricePerNightRub.toLocaleString("ru-RU")} ₽/ночь</span>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-lg font-semibold text-[var(--color-text)]">Итого: {total.toLocaleString("ru-RU")} ₽</span>
        </div>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Данные о перелётах от Duffel. Условия уточняйте при бронировании.</p>
      </div>
    </div>
  );
}

export function OfferCards({
  cards,
  onAddToCart,
  onSelectCard,
}: {
  cards: (OfferCard & { routeLabel?: string; riskScore?: number; riskFactors?: string[] })[];
  onAddToCart?: (card: OfferCard) => void;
  /** Для карточек «план поездки» (bundle, multiLeg): Выбрать → корзина и платёжный шлюз. */
  onSelectCard?: (card: OfferCard) => void;
}) {
  return (
    <div className="space-y-3">
      {cards.map((card, idx) => (
        <div key={card.type === "bundle" ? `bundle-${card.flights[0]?.id ?? ""}-${card.hotels[0]?.id ?? ""}-${idx}` : card.type === "multiLeg" ? `multiLeg-${idx}` : card.data?.id ?? idx}>
          {card.type === "flight" && <FlightCard data={card as OfferCard & { type: "flight" }} />}
          {card.type === "hotel" && <HotelCard data={card as OfferCard & { type: "hotel" }} />}
          {card.type === "train" && <TrainCard data={card as OfferCard & { type: "train" }} />}
          {card.type === "multiLeg" && <MultiLegCard card={card as MultiLegCardMeta} />}
          {card.type === "bundle" && (
            <BundleCard card={card as CardMeta & { type: "bundle" }} />
          )}
          {(card.type === "bundle" || card.type === "multiLeg") && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onSelectCard?.(card)}
                className="flex-1 py-2 rounded-[var(--radius-md)] font-medium text-[var(--color-text)] bg-[var(--color-primary)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Выбрать
              </button>
              <button
                type="button"
                className="py-2 px-4 rounded-[var(--radius-md)] font-medium text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Поделиться
              </button>
            </div>
          )}
          {onAddToCart && card.type !== "bundle" && card.type !== "multiLeg" && (
            <button
              type="button"
              onClick={() => onAddToCart(card)}
              className="mt-2 w-full py-2 rounded-[var(--radius-md)] font-medium text-[var(--color-text)] bg-[var(--color-primary)] hover:opacity-90 transition-opacity"
            >
              В корзину
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
