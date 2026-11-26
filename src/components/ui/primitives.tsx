import React, { useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Package } from 'lucide-react';
import type { EcoGrade } from '../../shared/types';
import { cn, getGradeStyle } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFAA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-[#00FFAA] text-[#09130F] hover:bg-[#19FFB3] font-semibold',
        secondary:
          'bg-[#1C2421] text-white border border-white/10 hover:bg-[#253029] hover:border-white/16',
        ghost: 'text-[#A0AAA5] hover:text-white hover:bg-white/6',
        danger: 'bg-[#E05A5A]/15 text-[#F38B8B] border border-[#E05A5A]/30 hover:bg-[#E05A5A]/25',
      },
      size: {
        sm: 'h-9 px-3.5 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-sm',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export const SurfaceCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      'rounded-xl bg-[#202923] border border-white/[0.08] p-5',
      className
    )}
  >
    {children}
  </div>
);

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full h-10 rounded-lg bg-[#161D1A] border border-white/10 px-3.5 text-sm text-white placeholder:text-[#7A8781] focus:outline-none focus:border-[#00FFAA]/60 focus:ring-1 focus:ring-[#00FFAA]/40 transition-colors',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  ariaLabel: string;
}> = ({ checked, onChange, id, ariaLabel }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFAA]',
      checked ? 'bg-[#00FFAA]' : 'bg-[#2C3731]'
    )}
  >
    <span
      className={cn(
        'pointer-events-none inline-block h-4 w-4 rounded-full bg-[#0D1411] transition-transform duration-150',
        checked ? 'translate-x-6' : 'translate-x-1'
      )}
    />
  </button>
);

export const GradeDisplay: React.FC<{
  grade: EcoGrade;
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}> = ({ grade, score, size = 'md' }) => {
  const style = getGradeStyle(grade);
  const displayGrade = grade === 'INSUFFICIENT_DATA' ? 'N/A' : grade;

  if (size === 'lg') {
    return (
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border font-mono text-3xl font-bold tabular-nums',
            style.bg,
            style.border,
            style.text
          )}
        >
          {displayGrade}
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-white tabular-nums">
              {score !== null ? score.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-[#A0AAA5] font-mono">/ 100</span>
          </div>
          <p className={cn('text-sm font-medium mt-0.5', style.text)}>
            {style.label}
          </p>
        </div>
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
        <span
          className={cn(
            'inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-semibold border',
            style.bg,
            style.border,
            style.text
          )}
        >
          {displayGrade}
        </span>
        <span className="text-white font-medium">
          {score !== null ? `${Math.round(score)}/100` : 'Insufficient data'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-mono text-sm font-bold border tabular-nums',
          style.bg,
          style.border,
          style.text
        )}
      >
        {displayGrade}
      </span>
      <div className="leading-tight">
        <div className="font-mono text-sm font-semibold text-white tabular-nums">
          {score !== null ? `${score.toFixed(1)}/100` : 'Insufficient'}
        </div>
        <div className={cn('text-xs', style.text)}>{style.label}</div>
      </div>
    </div>
  );
};

export const ProductImage: React.FC<{
  src?: string | null;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-gradient-to-br from-[#19221E] to-[#121715] text-[#6E7E76]',
          className
        )}
        role="img"
        aria-label={alt}
      >
        <Package className="h-8 w-8 opacity-60" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('object-cover bg-[#181F1C]', className)}
    />
  );
};

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-lg bg-white/[0.06]', className)} />
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#1C2421] px-6 py-12 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-[#00FFAA]">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-white">{title}</h3>
    <p className="mt-1.5 max-w-md text-sm text-[#A0AAA5] leading-relaxed">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);
