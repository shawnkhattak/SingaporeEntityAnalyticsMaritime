import { cloneElement, isValidElement, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  label: string;
  children: ReactElement<{ onMouseEnter?: (e: React.MouseEvent) => void; onMouseLeave?: (e: React.MouseEvent) => void; onFocus?: () => void; onBlur?: () => void }>;
  delay?: number;
};

export function Tooltip({ label, children, delay = 250 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; placement: "top" | "right" } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  function show(e: React.MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const railTooltip = rect.left < 96 && rect.width <= 48;
      setPos(
        railTooltip
          ? { x: rect.right + 10, y: rect.top + rect.height / 2, placement: "right" }
          : { x: rect.left + rect.width / 2, y: rect.top - 6, placement: "top" },
      );
      setOpen(true);
    }, delay);
  }

  function hide() {
    window.clearTimeout(timer.current);
    setOpen(false);
  }

  if (!isValidElement(children)) return children;

  const cloned = cloneElement(children, {
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  });

  return (
    <>
      {cloned}
      {open && pos && createPortal(
        <span className={`tooltip ${pos.placement}`} style={{ left: pos.x, top: pos.y }}>
          {label}
        </span>,
        document.body,
      )}
    </>
  );
}
