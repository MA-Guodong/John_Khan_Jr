import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'icon';

const variantStyles: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink/88 shadow-[0_1px_0_rgb(255_255_255/0.12)_inset]',
  secondary: 'border border-line bg-card text-ink hover:border-ink/25 hover:bg-card-muted',
  ghost: 'text-ink-soft hover:bg-card-muted hover:text-ink',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-[13px]',
  md: 'h-10 gap-2 px-4 text-sm',
  icon: 'h-9 w-9 p-0',
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center rounded-full font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-45',
    variantStyles[variant],
    sizeStyles[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}
