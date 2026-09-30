import React, { useEffect, useState } from 'react';
import { FileSearch, Globe, CheckCircle, Sparkles, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    title: 'Extracting content & key entities',
    desc: 'Identifying names, places, dates, and core factual assertions',
    icon: FileSearch,
  },
  {
    id: 2,
    title: 'Searching live sources via Google Search',
    desc: 'Querying public records, news wires, official sites, and fact-checking archives',
    icon: Globe,
  },
  {
    id: 3,
    title: 'Evaluating consensus against reliable reporting',
    desc: 'Confirming verified events and requiring evidence before rejecting claims',
    icon: CheckCircle,
  },
  {
    id: 4,
    title: 'Generating structured verification report',
    desc: 'Synthesizing evidence-based verdict, sources, and explanation',
    icon: Sparkles,
  },
];

export const LoadingSteps = () => {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStep(2), 2000);
    const timer2 = setTimeout(() => setCurrentStep(3), 4800);
    const timer3 = setTimeout(() => setCurrentStep(4), 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm max-w-xl mx-auto my-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <div className="w-6 h-6 border-2 border-sky-600 dark:border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white font-serif-heading">
          TruthLens Claim Evaluation in Progress
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Evaluating accuracy using real-time search results and authoritative reporting...
        </p>
      </div>

      {/* Progress Steps List */}
      <div className="space-y-4">
        {STEPS.map((step) => {
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all duration-300 ${
                isCurrent
                  ? 'border-sky-400/80 dark:border-sky-700/80 bg-sky-50/60 dark:bg-sky-950/30 shadow-sm'
                  : isDone
                  ? 'border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 opacity-90'
                  : 'border-transparent bg-slate-50/50 dark:bg-slate-950/20 opacity-40'
              }`}
            >
              {/* Status Indicator */}
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full border-2 border-sky-600 dark:border-sky-400 border-t-transparent animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                    {step.id}
                  </div>
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? 'text-sky-700 dark:text-sky-300'
                        : isDone
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {step.title}
                  </span>
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety Notice */}
      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Cross-checking against live web records to prevent outdated or false determinations.
        </p>
      </div>
    </div>
  );
};
