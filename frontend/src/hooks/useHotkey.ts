import { useEffect, useRef } from "react";

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function comboMatches(event: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split("+").map((s) => s.trim());
  const key = parts.pop() ?? "";
  const wantsMod = parts.includes("mod") || parts.includes("ctrl") || parts.includes("cmd");
  const wantsShift = parts.includes("shift");
  const wantsAlt = parts.includes("alt") || parts.includes("option");
  const mod = event.metaKey || event.ctrlKey;
  if (wantsMod !== mod) return false;
  if (wantsShift !== event.shiftKey) return false;
  if (wantsAlt !== event.altKey) return false;
  return event.key.toLowerCase() === key;
}

export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!comboMatches(e, combo)) return;
      const isEscape = combo.toLowerCase() === "escape";
      if (!isEscape && isTypingInField(e.target)) return;
      handlerRef.current(e);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [combo]);
}
