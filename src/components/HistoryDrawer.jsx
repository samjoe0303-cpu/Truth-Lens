import React from 'react';
import { X, Clock, Trash2, ChevronRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { getVerdictConfig } from '../utils/formatters';

export const HistoryDrawer = ({
  isOpen,
  onClose,
  history,
  onSelectReport,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 transition-transform">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-serif-heading">
              Verification History
            </h3>
            <span className="text-xs text-slate-400 font-mono-tabular">
              ({history.length}/10)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1"
                title="Clear all history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShieldCheck className="w-10 h-10 mb-2 stroke-[1.5] text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No past checks recorded
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Your last 10 verified claims will appear here for rapid access.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const config = getVerdictConfig(item.overall_verdict);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectReport(item);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-850 transition-all group flex items-start justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${config.bg} ${config.text} border ${config.border}`}>
                        {item.overall_verdict}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono-tabular">
                        {item.confidence}% confidence
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400">
                      {item.input_title || item.summary}
                    </p>

                    <p className="text-[10px] text-slate-400 mt-2 font-mono-tabular">
                      {new Date(item.analyzed_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
