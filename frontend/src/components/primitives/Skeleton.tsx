type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  rounded?: number | string;
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({ width = "100%", height = 14, rounded = 6, className = "", style }: SkeletonProps) {
  return (
    <span
      className={`skel ${className}`.trim()}
      style={{ display: "inline-block", width, height, borderRadius: rounded, ...style }}
      aria-hidden="true"
    />
  );
}
