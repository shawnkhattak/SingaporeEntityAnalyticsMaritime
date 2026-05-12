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
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
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

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="input"
        style={{ width: "100%", justifyContent: "space-between" }}
        onClick={() => setOpen((v) => !v)}
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
          className="panel-solid"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 40,
            maxHeight: 280,
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
              onMouseDown={(e) => e.preventDefault()}
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
