import React, { useEffect, useState, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  FileCheck, 
  Image as ImageIcon, 
  X, 
  Sparkles, 
  ArrowRight, 
  AlertCircle,
  Link2,
  Trash2,
  Paperclip,
  Mic,
  MicOff
} from 'lucide-react';
import { formatFileSize, readFileAsBase64 } from '../utils/formatters';

const SAMPLE_CLAIMS = [
  {
    title: 'Viral Space Rumor',
    text: 'NASA officially confirmed that Earth will experience 6 straight days of complete darkness due to a massive solar storm next month.',
    category: 'Science & Space',
  },
  {
    title: 'Exoplanet Carbon Discovery',
    text: 'The James Webb Space Telescope detected carbon-bearing molecules, including methane and carbon dioxide, in the atmosphere of habitable-zone exoplanet K2-18b.',
    category: 'Astronomy',
  },
  {
    title: 'Viral Health Remedy',
    text: 'Drinking concentrated lemon water mixed with baking soda kills 100% of cancer cells and prevents all seasonal viral respiratory infections.',
    category: 'Health & Medicine',
  },
  {
    title: 'Banking Legislation Claim',
    text: 'A new emergency financial regulation signed this week quietly bans all physical cash transactions exceeding $500 beginning next Monday.',
    category: 'Economy & Law',
  },
];

export const InputSection = ({
  activeTab,
  setActiveTab,
  textInput,
  setTextInput,
  uploadedFile,
  setUploadedFile,
  articleUrl,
  setArticleUrl,
  onAnalyze,
  isLoading,
  error,
  setError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechBaseRef = useRef('');
  const speechFinalRef = useRef('');

  useEffect(() => () => recognitionRef.current?.stop(), []);

  useEffect(() => {
    if (activeTab !== 'text') recognitionRef.current?.stop();
  }, [activeTab]);

  const updateTextFromSpeech = (interimText = '') => {
    const baseText = speechBaseRef.current.trimEnd();
    const spokenText = [speechFinalRef.current.trim(), interimText.trim()].filter(Boolean).join(' ');
    setTextInput([baseText, spokenText].filter(Boolean).join(' '));
  };

  const handleTextInputChange = (value) => {
    if (isListening) {
      speechBaseRef.current = value;
      speechFinalRef.current = '';
    }
    setTextInput(value);
    if (error) setError(null);
  };

  const toggleVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    speechBaseRef.current = textInput.trimEnd();
    speechFinalRef.current = '';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognition.onresult = (event) => {
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0].transcript.trim();
        if (result.isFinal) {
          speechFinalRef.current = [speechFinalRef.current.trim(), transcript].filter(Boolean).join(' ');
        } else {
          interimText = [interimText, transcript].filter(Boolean).join(' ');
        }
      }
      updateTextFromSpeech(interimText);
      if (error) setError(null);
    };
    recognition.onerror = (event) => {
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access was denied. Allow microphone access in your browser and try again.'
        : event.error === 'no-speech'
          ? 'No speech was detected. Try speaking again.'
          : event.error === 'network'
            ? 'Your browser could not reach its speech recognition service. Check your internet connection or try TruthLens in Chrome or Edge.'
            : event.error === 'audio-capture'
              ? 'No microphone input is available. Check that a microphone is connected and allowed in your browser.'
          : 'Voice input stopped unexpectedly. Please try again.';
      setError(message);
    };
    recognition.onend = () => {
      updateTextFromSpeech();
      recognitionRef.current = null;
      setIsListening(false);
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError('Could not start voice input. Check microphone access and try again.');
    }
  };

  const handleFileProcess = async (file) => {
    setError(null);
    
    // Size check: 25MB max
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`File size (${formatFileSize(file.size)}) exceeds the 25MB maximum limit. Please upload a smaller file.`);
      return;
    }

    const validTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'text/plain', 'text/markdown', 'text/csv'
    ];
    const isTextExtension = file.name.endsWith('.txt') || file.name.endsWith('.md');
    if (!validTypes.includes(file.type) && !isTextExtension) {
      setError('Unsupported file type. Please upload a PDF, screenshot/image (JPG/PNG/WebP), or plain text file.');
      return;
    }

    try {
      const { base64, previewUrl, textSnippet } = await readFileAsBase64(file);
      setUploadedFile({
        name: file.name,
        mimeType: file.type || 'text/plain',
        base64,
        size: file.size,
        previewUrl,
        textSnippet,
      });
    } catch (err) {
      console.error('File read error:', err);
      setError('Failed to read and process the selected file.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const hasValidInput = () => {
    if (activeTab === 'text') return textInput.trim().length > 0;
    if (activeTab === 'file') return uploadedFile !== null;
    if (activeTab === 'url') return articleUrl.trim().length > 0;
    return false;
  };

  return (
    <div className="w-full">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-serif-heading mb-3">
          Forensic Claim Verification
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
          Cross-check news articles, links, screenshots, and documents against current reporting.
        </p>
      </div>

      {/* Main Input Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all">
        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('text');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'text'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Text / Article</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('file');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'file'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Document / Image</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('url');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'url'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>News URL</span>
          </button>
        </div>

        {/* Tab Content Areas */}
        <div className="p-4 sm:p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="flex-1">{error}</div>
              <button 
                onClick={() => setError(null)} 
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: TEXT */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={textInput}
                  onChange={(e) => handleTextInputChange(e.target.value)}
                  placeholder="Paste a news headline, viral quote, social media screenshot transcription, or full article to cross-check..."
                  rows={6}
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all resize-y min-h-[140px]"
                />
                {textInput && (
                  <button
                    type="button"
                    onClick={() => handleTextInputChange('')}
                    className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white/80 dark:bg-slate-800/80 rounded-lg text-xs"
                    title="Clear text"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono-tabular">
                  {textInput.trim() ? `${textInput.trim().split(/\s+/).length} words · ${textInput.length} chars` : 'Enter claim or text snippet'}
                </span>
                <div className="flex items-center gap-3">
                  {isListening && (
                    <span role="status" className="text-rose-600 dark:text-rose-400">
                      Listening...
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                    aria-pressed={isListening}
                    className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                      isListening
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-sky-700 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isListening ? 'Stop' : 'Dictate'}
                  </button>
                  {textInput && (
                    <button
                      type="button"
                      onClick={() => handleTextInputChange('')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      Clear text
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FILE UPLOAD (PDF, Image, Text) */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {!uploadedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20'
                      : 'border-slate-300 dark:border-slate-700/80 hover:border-sky-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                    <UploadCloud className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Drag and drop your file here, or <span className="text-sky-600 dark:text-sky-400 underline decoration-sky-400/50">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supports news screenshots (PNG, JPG, WebP), PDF documents, and text files up to 25MB
                  </p>
                </div>
              ) : (
                /* File Preview Card */
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  {/* Visual Preview */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    {uploadedFile.mimeType.startsWith('image/') ? (
                      <img
                        src={uploadedFile.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : uploadedFile.mimeType === 'application/pdf' ? (
                      <div className="text-center p-2">
                        <FileText className="w-8 h-8 text-rose-500 mx-auto" />
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-1 block">PDF</span>
                      </div>
                    ) : (
                      <div className="text-center p-2">
                        <FileCheck className="w-8 h-8 text-sky-500 mx-auto" />
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-1 block">DOC</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata & Details */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {uploadedFile.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono-tabular">
                      {formatFileSize(uploadedFile.size)} · {uploadedFile.mimeType}
                    </p>
                    {uploadedFile.textSnippet && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 italic bg-white/70 dark:bg-slate-900/70 p-2 rounded border border-slate-200 dark:border-slate-800 text-left">
                        "{uploadedFile.textSnippet}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NEWS URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Link2 className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={articleUrl}
                  onChange={(e) => {
                    setArticleUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Paste a news article URL"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
                />
                {articleUrl && (
                  <button
                    type="button"
                    onClick={() => setArticleUrl('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Clear news URL"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Article text will be fetched and checked against other reporting.
              </p>
            </div>
          )}

          {/* Action Footer: Analyze Button */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Real-time Google Search grounding enabled</span>
            </div>

            <button
              type="button"
              disabled={isLoading || !hasValidInput()}
              onClick={onAnalyze}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-md ${
                isLoading || !hasValidInput()
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 hover:from-sky-500 hover:via-indigo-500 hover:to-sky-600 text-white shadow-sky-500/20 active:scale-[0.99]'
              }`}
            >
              <span>Analyze with TruthLens</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preset Sample Claims */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Explore Sample Test Claims
          </span>
          <span className="text-xs text-slate-400">Click any example to inspect</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SAMPLE_CLAIMS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setActiveTab('text');
                setTextInput(sample.text);
                setError(null);
              }}
              className="text-left p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:bg-sky-50/50 dark:hover:bg-slate-800/80 hover:border-sky-300 dark:hover:border-sky-800/60 transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                  {sample.title}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {sample.category}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                "{sample.text}"
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
