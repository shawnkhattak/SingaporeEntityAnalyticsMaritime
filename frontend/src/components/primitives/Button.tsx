import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "default" | "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  full?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export function Button({
  variant = "default",
  size = "md",
  iconOnly,
  full,
  loading,
  className = "",
  leadingIcon,
  trailingIcon,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [
    "btn",
    variant !== "default" && variant,
    size !== "md" && size,
    iconOnly && "icon",
    full && "full",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
