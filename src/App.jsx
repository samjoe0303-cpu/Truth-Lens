import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { LoadingSteps } from './components/LoadingSteps';
import { ResultsView } from './components/ResultsView';
import { HistoryDrawer } from './components/HistoryDrawer';
import { MethodologyModal } from './components/MethodologyModal';
import { ShieldCheck, Heart, ExternalLink, Globe } from 'lucide-react';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('truthlens_darkmode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [articleUrl, setArticleUrl] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);

  const [history, setHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('truthlens_history');
        if (saved) return JSON.parse(saved);
      } catch (err) {
        console.error('Failed to parse history from localStorage', err);
      }
    }
    return [];
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  // Sync dark mode class with html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('truthlens_darkmode', darkMode.toString());
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        type: activeTab,
      };

      if (activeTab === 'text') {
        if (!textInput.trim()) {
          throw new Error('Please enter text or an article claim to verify.');
        }
        payload.text = textInput.trim();
      } else if (activeTab === 'file') {
        if (!uploadedFile) {
          throw new Error('Please upload an image, PDF, or document to verify.');
        }
        payload.file = {
          name: uploadedFile.name,
          mimeType: uploadedFile.mimeType,
          base64: uploadedFile.base64,
          size: uploadedFile.size,
        };
      } else if (activeTab === 'url') {
        if (!articleUrl.trim()) {
          throw new Error('Please enter a news article URL to verify.');
        }
        payload.articleUrl = articleUrl.trim();
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification analysis failed. Please try again.');
      }

      const reportWithId = {
        ...data,
        id: Date.now().toString(),
      };

      setCurrentReport(reportWithId);

      // Persist to local state history (max 10)
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.id !== reportWithId.id);
        const updated = [reportWithId, ...filtered].slice(0, 10);
        try {
          localStorage.setItem('truthlens_history', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage error while saving history', e);
        }
        return updated;
      });

      // Scroll smoothly to top of results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Fact-check analysis error:', err);
      setError(err?.message || 'Failed to complete analysis. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('truthlens_history');
    } catch (e) {
      console.warn('LocalStorage clear error', e);
    }
  };

  const handleReset = () => {
    setCurrentReport(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {isLoading ? (
          <LoadingSteps inputType={activeTab} />
        ) : currentReport ? (
          <ResultsView report={currentReport} onReset={handleReset} />
        ) : (
          <InputSection
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            textInput={textInput}
            setTextInput={setTextInput}
            uploadedFile={uploadedFile}
            setUploadedFile={setUploadedFile}
            articleUrl={articleUrl}
            setArticleUrl={setArticleUrl}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            error={error}
            setError={setError}
          />
        )}
      </main>

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectReport={(report) => {
          setCurrentReport(report);
          setError(null);
        }}
        onClearHistory={handleClearHistory}
      />

      {/* Methodology Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      {/* Footer */}
      <footer className="no-print border-t border-slate-200 dark:border-slate-800/80 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 font-serif-heading">
              TruthLens
            </span>
            <span>· Objective News Verification Engine</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsMethodologyOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Fact-Checking Code of Principles
            </button>
            <span>·</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Search Grounding Active
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
