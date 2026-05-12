import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  variant?: "default" | "search" | "frosty";
  size?: "md" | "lg";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon, trailingIcon, variant = "default", size = "md", className = "", ...rest },
  ref,
) {
  const classes = ["input", variant !== "default" && variant, size === "lg" && "lg", className]
    .filter(Boolean)
    .join(" ");
  return (
    <label className={classes}>
      {leadingIcon}
      <input ref={ref} {...rest} />
      {trailingIcon}
    </label>
  );
});
