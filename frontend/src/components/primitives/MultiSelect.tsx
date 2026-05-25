import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type MultiSelectOption = { value: string; label: string };

type MultiSelectProps = {
  options: MultiSelectOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  maxLabel?: number;
};

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  maxLabel = 2,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open || !ref.current) return;
    const update = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const maxTop = Math.max(12, window.innerHeight - 300);
      setMenuRect({ left: rect.left, top: Math.min(rect.bottom + 4, maxTop), width: rect.width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, query]);

  const summary = useMemo(() => {
    if (selected.size === 0) return placeholder;
    const list = options.filter((o) => selected.has(o.value)).map((o) => o.label);
    if (list.length <= maxLabel) return list.join(", ");
    return `${list.slice(0, maxLabel).join(", ")} +${list.length - maxLabel}`;
  }, [selected, options, placeholder, maxLabel]);

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  function clearAll() {
    if (selected.size) onChange(new Set());
  }

  function updateMenuRect() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const maxTop = Math.max(12, window.innerHeight - 300);
    setMenuRect({ left: rect.left, top: Math.min(rect.bottom + 4, maxTop), width: rect.width });
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="input"
        style={{ width: "100%", justifyContent: "space-between" }}
        onClick={() => {
          updateMenuRect();
          setOpen((v) => !v);
        }}
      >
        <span className={selected.size ? "" : "t-faded"} style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {summary}
        </span>
        {selected.size > 0 && (
          <X
            size={13}
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            style={{ cursor: "pointer", color: "var(--slate-400)" }}
          />
        )}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="panel-solid multi-select-menu"
          onMouseDown={(event) => event.stopPropagation()}
          style={{
            position: "fixed",
            top: menuRect?.top ?? 0,
            left: menuRect?.left ?? 0,
            width: menuRect?.width ?? undefined,
            zIndex: 80,
            maxHeight: "min(280px, calc(100vh - 24px))",
            overflow: "auto",
            padding: 6,
          }}
        >
          <label className="input search" style={{ marginBottom: 4 }}>
            <Search />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} autoFocus />
          </label>
          {filtered.length === 0 && <div className="t-faded" style={{ padding: 8, fontSize: 12 }}>No matches</div>}
          {filtered.map((o) => (
            <label
              key={o.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 6,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(o.value)}
                onChange={() => toggle(o.value)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
