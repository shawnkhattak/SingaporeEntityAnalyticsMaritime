type SeamBrandProps = {
  size?: "sm" | "md" | "lg";
  stacked?: boolean;
  animated?: boolean;
  showTagline?: boolean;
};

export function SeamWordmark({ size = "md" }: Pick<SeamBrandProps, "size">) {
  return (
    <span className={`seam-wordmark ${size}`}>
      SE<span>A</span>M
    </span>
  );
}

export function SeamMark({ size = "md", animated = false }: Pick<SeamBrandProps, "size" | "animated">) {
  return (
    <span className={`seam-mark ${size}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <rect width="100" height="100" rx="23.7" fill="#0B2545" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.3" />
        <polygon points="50,18 56,50 50,82 44,50" fill="#FFFFFF" opacity="0.9" />
        <polygon points="18,50 50,46 82,50 50,54" fill="#F59E0B" />
        {animated && (
          <g>
            <path d="M50,50 L92,50 A42,42 0 0,0 70,12 Z" fill="#F59E0B" opacity="0.22" />
            <line x1="50" y1="50" x2="92" y2="50" stroke="#F59E0B" strokeWidth="1.2" opacity="0.85" />
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="5s"
              repeatCount="indefinite"
            />
          </g>
        )}
        <circle cx="50" cy="50" r="3.2" fill="#0B2545" stroke="#FFFFFF" strokeWidth="1.4" />
      </svg>
    </span>
  );
}

export function SeamBrand({ size = "md", stacked = false, animated = false, showTagline = false }: SeamBrandProps) {
  return (
    <span className={`seam-brand ${size} ${stacked ? "stacked" : ""}`}>
      <SeamMark size={size} animated={animated} />
      <span className="seam-brand-copy">
        <SeamWordmark size={size} />
        {showTagline && <span className="seam-brand-tagline">Maritime · Intelligence</span>}
      </span>
    </span>
  );
}
