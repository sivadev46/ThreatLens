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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer';

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-xs gap-2',
    lg: 'px-4 py-2.5 text-sm gap-2',
  };

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-500 shadow-xs border border-blue-500/40',
    secondary: 'bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/70 focus-visible:outline-slate-500',
    danger: 'bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-500/30 focus-visible:outline-rose-500 shadow-xs',
    ghost: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 focus-visible:outline-slate-500',
    outline: 'border border-slate-700/80 text-slate-300 hover:border-slate-600 hover:text-white hover:bg-slate-800/40 focus-visible:outline-slate-500',
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
