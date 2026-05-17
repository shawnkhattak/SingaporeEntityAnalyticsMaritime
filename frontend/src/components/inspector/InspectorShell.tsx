import { ChevronsLeftRight, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useInspectorState } from "../../state/AppState";
import { Tabs, type TabItem } from "../primitives/Tabs";

type InspectorShellProps = {
  title: string;
  breadcrumb?: string;
  tabs?: TabItem[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export function InspectorShell({ title, breadcrumb, tabs, activeTab = 0, onTabChange, footer, onClose, children }: InspectorShellProps) {
  const { width, resize } = useInspectorState();

  useEffect(() => {
    // Reset scroll on every mount via the body element.
  }, [title]);

  return (
    <aside
      className="inspector panel"
      role="complementary"
      aria-label={title}
      style={{ width }}
    >
      <header className="inspector-head">
        <div className="row" style={{ gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {breadcrumb && <div className="t-caption">{breadcrumb}</div>}
            <h2 className="t-h1" title={title} style={{ margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h2>
          </div>
          <button
            className="btn ghost icon sm"
            onClick={() => resize(width === 480 ? 720 : 480)}
            aria-label={width === 480 ? "Expand inspector width to 720px" : "Collapse inspector width to 480px"}
            title={width === 480 ? "Widen panel" : "Narrow panel"}
          >
            <ChevronsLeftRight size={14} />
          </button>
          <button className="btn ghost icon sm" onClick={onClose} aria-label="Close inspector" title="Close">
            <X size={14} />
          </button>
        </div>
      </header>
      {tabs && tabs.length > 0 && (
        <div className="inspector-tabs">
          <Tabs items={tabs} active={activeTab} onChange={onTabChange ?? (() => undefined)} />
        </div>
      )}
      <div className="inspector-body scroll">
        {/* Re-keying on activeTab forces a remount of the panel
            contents which retriggers the CSS fade-in animation —
            tab swaps feel like proper transitions, not a snap. */}
        <div key={activeTab} className="anim-fade-in">{children}</div>
      </div>
      {footer && <footer className="inspector-foot">{footer}</footer>}
    </aside>
  );
}
