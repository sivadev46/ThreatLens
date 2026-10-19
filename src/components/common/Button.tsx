import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer';

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-xs gap-2',
    lg: 'px-4 py-2.5 text-sm gap-2',
  };

  const variantStyles = {
    primary:
      'bg-sky-600 text-white hover:bg-sky-500 focus-visible:outline-sky-500 shadow-xs border border-sky-500/40',
    secondary:
      'dark:bg-slate-800/80 bg-slate-100 dark:text-slate-200 text-slate-800 dark:hover:bg-slate-700 hover:bg-slate-200/80 dark:border-slate-700/70 border-slate-200 focus-visible:outline-slate-500',
    danger:
      'bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-500/30 focus-visible:outline-rose-500 shadow-xs',
    ghost:
      'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-800/60 hover:bg-slate-100 focus-visible:outline-slate-500',
    outline:
      'border dark:border-slate-700/80 border-slate-300 dark:text-slate-300 text-slate-700 dark:hover:border-slate-600 hover:border-slate-400 dark:hover:text-white hover:text-slate-900 dark:hover:bg-slate-800/40 hover:bg-slate-50 focus-visible:outline-slate-500',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
};
