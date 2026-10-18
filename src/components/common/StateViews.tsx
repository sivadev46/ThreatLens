import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Button } from './Button';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading security telemetry...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-3 stroke-[2]" />
      <p className="text-xs font-medium text-slate-300">{message}</p>
      <span className="text-[11px] text-slate-500 mt-1">Retrieving logs from data pipeline</span>
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
  icon = <Inbox className="w-8 h-8 text-slate-600 stroke-[1.5]" />,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
      <div className="mb-2.5 text-slate-500">{icon}</div>
      <h3 className="text-xs font-semibold text-slate-200">{title}</h3>
      <p className="text-[11px] text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
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
    <div className="flex flex-col items-center justify-center p-12 text-center border border-rose-900/40 rounded-xl bg-rose-950/10">
      <AlertCircle className="w-6 h-6 text-rose-400 mb-2.5 stroke-[2]" />
      <h3 className="text-xs font-semibold text-rose-200">{title}</h3>
      <p className="text-[11px] text-rose-300/80 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <Button size="sm" variant="danger" onClick={onRetry}>
          Retry Query
        </Button>
      )}
    </div>
  );
};
