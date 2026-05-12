import { Anchor, ChevronLeft, ChevronRight } from "lucide-react";
import { usePanelState } from "../../state/AppState";

export function BrandHeader() {
  const { isCollapsed, toggle } = usePanelState();
  return (
    <div className="row" style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--gray-200)" }}>
      <a href="/" className="row" style={{ gap: 8, color: "var(--navy-900)", textDecoration: "none", fontWeight: 700 }}>
        <Anchor size={20} strokeWidth={1.9} color="var(--ocean-500)" />
        {!isCollapsed && (
          <>
            <span style={{ fontSize: 15, letterSpacing: "-0.01em" }}>SEAM</span>
            <span className="t-faded" style={{ fontSize: 11 }}>V2</span>
          </>
        )}
      </a>
      <span className="spacer" />
      <button
        type="button"
        className="btn ghost icon sm"
        onClick={toggle}
        aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
        title={isCollapsed ? "Expand" : "Collapse"}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
}
