import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  headerClassName = '',
  noPadding = false,
}) => {
  return (
    <div
      className={`dark:bg-[#0c121e] bg-white dark:border-slate-800/80 border-slate-200/90 border rounded-xl shadow-xs overflow-hidden transition-colors duration-150 ${className}`}
    >
      {(title || action) && (
        <div
          className={`px-5 py-3.5 border-b dark:border-slate-800/80 border-slate-100 flex items-center justify-between gap-4 ${headerClassName}`}
        >
          <div>
            {title && (
              <h3 className="text-sm font-semibold tracking-tight dark:text-slate-100 text-slate-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
};
