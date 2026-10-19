import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Button } from './Button';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading security telemetry...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Loader2 className="w-6 h-6 text-sky-500 animate-spin mb-3 stroke-[2]" />
      <p className="text-xs font-medium dark:text-slate-300 text-slate-700">{message}</p>
      <span className="text-[11px] dark:text-slate-500 text-slate-400 mt-1">Retrieving logs from data pipeline</span>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({
  title,
  description,
  actionText,
  onAction,
  icon = <Inbox className="w-8 h-8 dark:text-slate-600 text-slate-400 stroke-[1.5]" />,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed dark:border-slate-800 border-slate-200 rounded-xl dark:bg-slate-900/20 bg-slate-50/50">
      <div className="mb-2.5">{icon}</div>
      <h3 className="text-xs font-semibold dark:text-slate-200 text-slate-800">{title}</h3>
      <p className="text-[11px] dark:text-slate-400 text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({
  title = 'Telemetry Error',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border dark:border-rose-900/40 border-rose-200 rounded-xl dark:bg-rose-950/10 bg-rose-50/50">
      <AlertCircle className="w-6 h-6 text-rose-500 mb-2.5 stroke-[2]" />
      <h3 className="text-xs font-semibold dark:text-rose-200 text-rose-800">{title}</h3>
      <p className="text-[11px] dark:text-rose-300/80 text-rose-600 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <Button size="sm" variant="danger" onClick={onRetry}>
          Retry Query
        </Button>
      )}
    </div>
  );
};
