import type { ReactNode } from "react";

export type TabItem = { label: string; count?: number; icon?: ReactNode };

type TabsProps = {
  items: TabItem[];
  active: number;
  onChange: (index: number) => void;
  className?: string;
};

export function Tabs({ items, active, onChange, className = "" }: TabsProps) {
  return (
    <div className={`tabs ${className}`.trim()} role="tablist">
      {items.map((item, index) => {
        const isActive = active === index;
        return (
          <button
            key={item.label}
            role="tab"
            aria-selected={isActive}
            className={`tab ${isActive ? "active" : ""}`}
            onClick={() => onChange(index)}
          >
            {item.icon}
            {item.label}
            {typeof item.count === "number" && <span className="count">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
