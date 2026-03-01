"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/app/providers";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuthModal({ isOpen, onClose }: Props) {
  const { setUser } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleSendCode = async () => {
    let raw = phone.replace(/\D/g, "");
    if (raw.startsWith("8") && raw.length === 11) raw = "7" + raw.slice(1);
    if (!raw.startsWith("7")) raw = "7" + raw;
    if (raw.length < 11) {
      setError("Введите номер телефона (10 цифр)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+${raw}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка отправки кода");
      setDevCode(data.devCode ?? null);
      setStep("code");
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки кода");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim() || code.trim().length < 4) {
      setError("Введите код из СМС");
      return;
    }
    let raw = phone.replace(/\D/g, "");
    if (raw.startsWith("8") && raw.length === 11) raw = "7" + raw.slice(1);
    if (!raw.startsWith("7")) raw = "7" + raw;
    const phoneForReq = `+${raw}`;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneForReq, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка входа");
      if (data.token && typeof window !== "undefined") {
        localStorage.setItem("travel_token", data.token);
      }
      if (data.user) setUser(data.user);
      onClose();
      setStep("phone");
      setPhone("");
      setCode("");
      setDevCode(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] bg-[var(--color-surface)] shadow-xl border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
          <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "var(--font-georama), sans-serif" }}>
            Вход в личный кабинет
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Войдите по номеру телефона — мы учтём кэшбэк на путешествия и ваши траты для персонального подбора.
          </p>
          {error && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-risk)]/10 border border-[var(--color-risk)]/30 px-3 py-2 text-sm text-[var(--color-risk)]">
              {error}
            </div>
          )}
          {step === "phone" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Номер телефона</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 999 123-45-67"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                className="w-full py-3 rounded-[var(--radius-md)] font-medium text-[var(--color-text)] bg-[var(--color-accent)] hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {loading ? "Отправка…" : "Получить код"}
              </button>
            </>
          )}
          {step === "code" && (
            <>
              <div className="text-sm text-[var(--color-text-secondary)]">
                Код отправлен на номер <span className="font-medium text-[var(--color-text)]">{phone || "+7 ***"}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Код из СМС</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  autoFocus
                />
              </div>
              {devCode && (
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Для разработки: код <strong className="text-[var(--color-text)]">{devCode}</strong>
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setError(""); setCode(""); setDevCode(null); }}
                  className="flex-1 py-3 rounded-[var(--radius-md)] font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg)]"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading}
                  className="flex-1 py-3 rounded-[var(--radius-md)] font-medium text-[var(--color-text)] bg-[var(--color-accent)] hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {loading ? "Вход…" : "Войти"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
