import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  RotateCcw, 
  ShieldCheck, 
  Flag, 
  Lightbulb, 
  Globe, 
  Copy, 
  Check, 
  FileText,
  AlertCircle,
  Search
} from 'lucide-react';
import { getVerdictConfig, getConfidenceAssessment } from '../utils/formatters';

export const ResultsView = ({ report, onReset }) => {
  const [expandedClaims, setExpandedClaims] = useState({ 0: true });
  const [copied, setCopied] = useState(false);

  const hasSources = report.grounded_sources && report.grounded_sources.length > 0;
  const verdictConfig = getVerdictConfig(report.overall_verdict);
  const confidenceAssessment = getConfidenceAssessment(report.confidence);
  const confidenceColor = report.overall_verdict === 'Unverifiable'
    ? 'text-slate-600 dark:text-slate-400'
    : confidenceAssessment.color;

  const toggleClaim = (index) => {
    setExpandedClaims((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleShare = async () => {
    const shareText = `TruthLens Fact-Check Report:
Claim/Subject: "${report.input_title || 'News Claim'}"
Overall Verdict: ${report.overall_verdict} (${hasSources ? `${report.confidence}% confidence` : 'No sources found'})
Summary: ${report.summary}

Evaluated via TruthLens with Google Search grounding.`;

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getVerdictIcon = (verdict) => {
    switch (verdict) {
      case 'True':
      case 'Mostly True':
        return <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'Misleading':
        return <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'False':
      case 'Mostly False':
        return <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'Unverifiable':
      default:
        return <HelpCircle className="w-8 h-8 text-slate-500 dark:text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Verify Another Claim</span>
        </button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Summary Copied' : 'Share Report'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-xs"
            title="Download report as PDF or Print"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Download PDF / Print</span>
          </button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print-header mb-6">
        <h1 className="text-2xl font-bold font-serif-heading">TruthLens Fact-Check Dossier</h1>
        <p className="text-xs text-slate-500 mt-1">
          Analyzed at {new Date(report.analyzed_at).toLocaleString()} · Google Search Grounded
        </p>
      </div>

      {/* CORE VERDICT CARD */}
      <div className={`p-6 sm:p-8 rounded-2xl border ${verdictConfig.border} ${verdictConfig.bg} transition-all break-inside-avoid relative overflow-hidden`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Verdict Info */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800 shrink-0">
              {getVerdictIcon(report.overall_verdict)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  Overall Verdict
                </span>
                <span className="text-[11px] text-slate-400 font-mono-tabular">
                  · {report.current_date || new Date(report.analyzed_at).toLocaleDateString()}
                </span>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-serif-heading ${verdictConfig.text}`}>
                {report.overall_verdict}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                {!hasSources
                  ? 'No authoritative sources found confirming or contradicting this assertion.'
                  : verdictConfig.description}
              </p>
            </div>
          </div>

          {/* Confidence Meter / Status */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 sm:border-l border-slate-200/60 dark:border-slate-800/60 pt-4 sm:pt-0 sm:pl-6 shrink-0">
            <div className="text-left sm:text-right">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Verdict Confidence
              </span>
              <div className="flex items-baseline gap-1 sm:justify-end mt-0.5">
                {hasSources ? (
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono-tabular">
                    {report.confidence}%
                  </span>
                ) : (
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    No Sources Found
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-medium ${hasSources ? confidenceColor : 'text-slate-400'} block mt-0.5`}>
                {hasSources ? confidenceAssessment.label : 'Inconclusive / Uncorroborated'}
              </span>
            </div>

            {/* Confidence Bar */}
            <div className="w-28 sm:w-36 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${verdictConfig.indicator}`}
                style={{ width: `${hasSources ? report.confidence : 15}%` }}
              />
            </div>
          </div>
        </div>

        {/* Input Subject / Claim Title Excerpt */}
        {report.input_title && (
          <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Investigated Claim / Content: </span>
            <span className="italic text-slate-600 dark:text-slate-400">"{report.input_title}"</span>
          </div>
        )}
      </div>

      {/* SEARCH SOURCES (Displayed directly under the verdict) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs break-inside-avoid">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Supporting Search Sources {hasSources ? `(${report.grounded_sources.length})` : ''}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {hasSources ? 'Search Grounding Citations' : 'Web Record Status'}
          </span>
        </div>

        {hasSources ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {report.grounded_sources.map((src, idx) => {
              let domain = '';
              try {
                domain = new URL(src.url).hostname.replace(/^www\./, '');
              } catch {
                domain = 'Source';
              }

              return (
                <a
                  key={idx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400">
                      {src.title || domain}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono-tabular truncate">
                      {src.url}
                    </p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-sky-500 shrink-0 mt-1" />
                </a>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/40 text-center">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              No sources found
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Live web searches returned no authoritative corroboration or debunking. In accordance with epistemic rules, this claim is marked Unverifiable rather than presumed false.
            </p>
          </div>
        )}
      </div>

      {/* EXECUTIVE SUMMARY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs break-inside-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-sky-500" />
          Verdict Summary & Rationale
        </h3>
        <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
          {report.summary}
        </p>
      </div>

      {/* UNVERIFIED SECONDARY DETAILS (If core facts confirmed but small details unverified) */}
      {report.unverified_details && report.unverified_details.length > 0 && (
        <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/50 rounded-2xl p-5 break-inside-avoid">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300">
              Unverified Secondary Details (Core Facts Confirmed)
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
            The core assertions were verified as Mostly True, but the following specific nuances or secondary figures could not be independently confirmed:
          </p>
          <ul className="space-y-1.5">
            {report.unverified_details.map((detail, dIdx) => (
              <li key={dIdx} className="text-xs text-sky-950 dark:text-sky-200 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* EXTRACTED CLAIMS BREAKDOWN */}
      <div className="space-y-3 break-inside-avoid">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-500" />
            Specific Factual Claims Evaluated ({report.claims?.length || 0})
          </h3>
          <span className="text-xs text-slate-400">Search-grounded evidence breakdown</span>
        </div>

        {report.claims && report.claims.length > 0 ? (
          <div className="space-y-3">
            {report.claims.map((item, idx) => {
              const itemConfig = getVerdictConfig(item.verdict);
              const isExpanded = !!expandedClaims[idx];

              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs transition-all"
                >
                  {/* Card Header / Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleClaim(idx)}
                    className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md shrink-0 mt-0.5 ${itemConfig.bg} ${itemConfig.text} border ${itemConfig.border}`}>
                        {item.verdict}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                        {item.claim}
                      </p>
                    </div>
                    <div className="text-slate-400 mt-1 shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Card Body */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          Why this verdict was chosen:
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>

                      {/* Sources for this claim */}
                      {item.sources && item.sources.length > 0 ? (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                            Supporting Sources:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {item.sources.map((src, sIdx) => {
                              let domain = '';
                              try {
                                domain = new URL(src.url).hostname.replace(/^www\./, '');
                              } catch {
                                domain = 'Source';
                              }

                              return (
                                <a
                                  key={sIdx}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/70 dark:border-sky-800/70 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors group"
                                >
                                  <Globe className="w-3 h-3 text-sky-500" />
                                  <span className="max-w-[180px] sm:max-w-[240px] truncate">
                                    {src.title || domain}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono-tabular">({domain})</span>
                                  <ExternalLink className="w-3 h-3 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          No direct contradictory or corroborating sources indexed for this specific assertion.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            No separable factual assertions identified.
          </p>
        )}
      </div>

      {/* CONTEXT / RED FLAGS SECTION (Only shown when present) */}
      {report.red_flags && report.red_flags.length > 0 && (
        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-6 break-inside-avoid">
          <div className="flex items-center gap-2 mb-3">
            <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
              Identified Context & Content Observations ({report.red_flags.length})
            </h3>
          </div>
          <ul className="space-y-2">
            {report.red_flags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-950 dark:text-amber-200/90 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* HOW TO VERIFY YOURSELF */}
      {report.tips && (
        <div className="bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/40 rounded-2xl p-6 break-inside-avoid">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300">
              Independent Verification Guide
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-sky-950 dark:text-sky-200/90 leading-relaxed">
            {report.tips}
          </p>
        </div>
      )}

      {/* MANDATORY DISCLAIMER */}
      <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-center">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Disclaimer:</span> AI-generated analysis based on real-time web search grounding. Always cross-check important news with trusted sources and primary documentation.
        </p>
      </div>
    </div>
  );
};
