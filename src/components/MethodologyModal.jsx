import React from 'react';
import { X, Search, CheckCircle, XCircle, HelpCircle, ShieldCheck } from 'lucide-react';

export const MethodologyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif-heading">
                TruthLens Verification Methodology
              </h3>
              <p className="text-xs text-slate-500">Objective, Evidence-First Verification Process</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className="text-slate-800 dark:text-slate-200 font-medium">
            TruthLens evaluates claims through an objective, evidence-based sequence designed to prevent falsely rejecting authentic or breaking news:
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                a
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Active Web & Entity Search:</strong>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Queries current web records, official bodies, primary registries, and reporting for key names, places, and events with the current date to account for recent developments.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                b
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Affirmative Confirmation (True / Mostly True):</strong>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  If reliable sources (established news outlets, government agencies, scientific journals, or verified fact-checks) confirm the event, it is verified as True or Mostly True.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                c
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Strict Contradiction Standard (False):</strong>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  A claim is marked False ONLY if reliable sources directly contradict it or a certified fact-checking organization has explicitly debunked it.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                d
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Absence of Evidence is Not Proof of Falsehood (Unverifiable):</strong>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  If reliable sources cannot be found either confirming or contradicting the claim, TruthLens returns "Unverifiable" rather than assuming it is false.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
