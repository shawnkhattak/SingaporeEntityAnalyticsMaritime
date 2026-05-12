import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", ...rest }: SelectProps) {
  return <select className={`select ${className}`.trim()} {...rest} />;
}
