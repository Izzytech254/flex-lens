// FixLens design system primitives. Keep screens consistent by building from these.
import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, ChevronLeft } from 'lucide-react';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper';

// ---------------------------------------------------------------- Button

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-2',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 shadow-[0_8px_20px_-8px_rgba(229,88,42,0.6)]',
  secondary: 'bg-white text-ink border border-hairline hover:border-ink/30 hover:bg-paper',
  ghost: 'text-ink-soft hover:bg-paper-deep hover:text-ink',
  danger: 'bg-white text-rose-700 border border-hairline hover:bg-rose-50 hover:border-rose-200',
  success: 'bg-moss-500 text-white hover:bg-moss-700',
  dark: 'bg-ink text-white hover:bg-ink-2',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-[15px] gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', size = 'md', fullWidth, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center rounded-xl font-medium whitespace-nowrap transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        FOCUS,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    />
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'secondary' | 'ghost' | 'active';
  size?: 'sm' | 'md';
}

export function IconButton({ label, variant = 'secondary', size = 'md', className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex items-center justify-center rounded-full transition-colors shrink-0',
        'disabled:opacity-40 disabled:pointer-events-none',
        FOCUS,
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        variant === 'secondary' && 'bg-white text-ink-soft border border-hairline hover:border-ink/30 hover:text-ink',
        variant === 'ghost' && 'text-ink-soft hover:bg-paper-deep hover:text-ink',
        variant === 'active' && 'bg-ink text-accent-400 border border-ink hover:bg-ink-2',
        className
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------- Layout

export function Page({
  size = 'md',
  className,
  children,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  children: React.ReactNode;
}) {
  const width = { sm: 'max-w-xl', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }[size];
  return <div className={cx('w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fadeIn', width, className)}>{children}</div>;
}

/**
 * Editorial page header: numbered eyebrow ("02 / Diagnosis"), serif title, hairline rule.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  onBack,
  backLabel = 'Back',
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 pb-5 border-b border-hairline">
      <div className="flex items-center gap-2 min-h-8">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={cx('-ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-xs text-ink-soft hover:text-ink', FOCUS)}
          >
            <ChevronLeft className="w-4 h-4" />
            {backLabel}
          </button>
        )}
        {eyebrow && !onBack && <span className="eyebrow text-accent-600">{eyebrow}</span>}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      {eyebrow && onBack && <span className="eyebrow text-accent-600 block mt-3">{eyebrow}</span>}
      <h1 className="mt-2 font-display font-semibold text-3xl sm:text-[2.6rem] leading-[1.08] tracking-[-0.02em] text-ink">{title}</h1>
      {description && <p className="mt-3 text-[15px] text-ink-soft leading-relaxed max-w-xl">{description}</p>}
    </div>
  );
}

export function Card({
  className,
  padded = true,
  children,
  as: Tag = 'div',
}: {
  className?: string;
  padded?: boolean;
  children: React.ReactNode;
  as?: 'div' | 'section' | 'article';
}) {
  return (
    <Tag
      className={cx(
        'bg-white border border-hairline rounded-2xl shadow-[0_1px_0_rgba(15,29,58,0.03),0_8px_24px_-12px_rgba(15,29,58,0.08)]',
        padded && 'p-5 sm:p-6',
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cx('eyebrow text-ink-soft mb-3', className)}>{children}</h2>;
}

// ---------------------------------------------------------------- Badge

type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red';

const BADGE_TONES: Record<Tone, string> = {
  neutral: 'bg-paper text-ink-soft ring-ink/15',
  blue: 'bg-paper-deep text-ink ring-ink/15',
  green: 'bg-moss-100 text-moss-700 ring-moss-500/25',
  amber: 'bg-accent-100 text-accent-700 ring-accent-500/30',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export function Badge({
  tone = 'neutral',
  mono,
  className,
  children,
}: {
  tone?: Tone;
  mono?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        mono && 'font-mono',
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- Notice

const NOTICE: Record<'info' | 'warning' | 'success' | 'danger', { box: string; icon: React.ReactNode }> = {
  info: { box: 'bg-white border-hairline text-ink', icon: <Info className="w-4 h-4 text-ink-soft" /> },
  warning: { box: 'bg-accent-100 border-accent-300 text-accent-700', icon: <AlertTriangle className="w-4 h-4 text-accent-600" /> },
  success: { box: 'bg-moss-100 border-moss-500/25 text-moss-700', icon: <CheckCircle2 className="w-4 h-4 text-moss-500" /> },
  danger: { box: 'bg-rose-50 border-rose-200 text-rose-900', icon: <XCircle className="w-4 h-4 text-rose-600" /> },
};

export function Notice({
  tone = 'info',
  title,
  icon,
  className,
  children,
}: {
  tone?: keyof typeof NOTICE;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  const style = NOTICE[tone];
  return (
    <div
      role={tone === 'warning' || tone === 'danger' ? 'alert' : 'note'}
      className={cx('flex gap-3 rounded-xl border p-3.5 text-sm leading-relaxed', style.box, className)}
    >
      <span className="mt-0.5 shrink-0">{icon ?? style.icon}</span>
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Misc

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6">
      <div className="mx-auto w-12 h-12 rounded-full bg-paper-deep text-ink-soft flex items-center justify-center">{icon}</div>
      <h2 className="mt-5 font-display font-semibold text-2xl tracking-tight text-ink">{title}</h2>
      {description && <p className="mt-2 text-sm text-ink-soft max-w-sm mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="h-1.5 w-full rounded-full bg-paper-deep overflow-hidden"
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-accent-500 transition-[width] duration-500" style={{ width: `${v}%` }} />
    </div>
  );
}

export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={cx('h-1 flex-1 rounded-full transition-colors', i <= current ? 'bg-accent-500' : 'bg-paper-deep')} />
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        FOCUS,
        checked ? 'bg-ink' : 'bg-hairline'
      )}
    >
      <span
        className={cx(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

export { cx };
