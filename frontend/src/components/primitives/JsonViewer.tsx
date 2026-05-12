import { Copy } from "lucide-react";
import { useMemo, useState } from "react";

type JsonViewerProps = {
  value: unknown;
  initiallyExpanded?: number; // depth
};

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatJson(value: unknown, indent = 0, depth = 0, maxDepth = 32): string {
  const pad = "  ".repeat(indent);
  const padInner = "  ".repeat(indent + 1);
  if (value === null) return `<span class="n">null</span>`;
  if (value === undefined) return `<span class="u">undefined</span>`;
  if (typeof value === "boolean") return `<span class="b">${value}</span>`;
  if (typeof value === "number") return `<span class="n">${value}</span>`;
  if (typeof value === "string") return `<span class="s">"${escape(value)}"</span>`;
  if (depth > maxDepth) return `<span class="u">…</span>`;
  if (Array.isArray(value)) {
    if (value.length === 0) return `<span class="punct">[]</span>`;
    const items = value
      .map((v) => `${padInner}${formatJson(v, indent + 1, depth + 1, maxDepth)}`)
      .join(`<span class="punct">,</span>\n`);
    return `<span class="punct">[</span>\n${items}\n${pad}<span class="punct">]</span>`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `<span class="punct">{}</span>`;
    const lines = entries
      .map(
        ([k, v]) =>
          `${padInner}<span class="k">"${escape(k)}"</span><span class="punct">: </span>${formatJson(v, indent + 1, depth + 1, maxDepth)}`,
      )
      .join(`<span class="punct">,</span>\n`);
    return `<span class="punct">{</span>\n${lines}\n${pad}<span class="punct">}</span>`;
  }
  return `<span class="u">${escape(String(value))}</span>`;
}

export function JsonViewer({ value }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => formatJson(value), [value]);
  const raw = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  function copy() {
    navigator.clipboard?.writeText(raw).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn sm icon"
        style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}
        onClick={copy}
        aria-label="Copy JSON"
        title={copied ? "Copied" : "Copy"}
      >
        <Copy size={12} />
      </button>
      <pre className="json-viewer scroll" style={{ margin: 0, whiteSpace: "pre" }}>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
