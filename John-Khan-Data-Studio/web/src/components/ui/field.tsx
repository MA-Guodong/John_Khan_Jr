import { ChevronDown, Search, X } from 'lucide-react';
import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onValueChange, placeholder = '搜索…', className, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-line bg-card pl-10 pr-9 text-sm text-ink placeholder:text-muted/70 transition focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/10 [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label="清空搜索"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:bg-card-muted hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function SelectField({ label, className, children, ...props }: SelectFieldProps) {
  return (
    <label className={cn('relative inline-flex items-center', className)}>
      {label ? <span className="sr-only">{label}</span> : null}
      <select
        className="h-10 w-full appearance-none rounded-full border border-line bg-card pl-4 pr-9 text-sm text-ink transition hover:border-ink/20 focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/10"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted" aria-hidden />
    </label>
  );
}
