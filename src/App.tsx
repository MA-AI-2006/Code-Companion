import React, { useState, useEffect } from 'react';
import { SimpleCodeReviewer } from './components/SimpleCodeReviewer';
import { CodeGenerator } from './components/CodeGenerator';
import { FileAndGithubHub } from './components/FileAndGithubHub';
import { SharedSnippet } from './types';
import { Code2, Sparkles, HelpCircle, Share2, FolderPlus } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'review' | 'generate' | 'files_github'>('review');
  const [sharedData, setSharedData] = useState<SharedSnippet | null>(null);
  const [loadingShare, setLoadingShare] = useState<boolean>(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Check URL query parameters for ?share=ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');

    if (shareId) {
      setLoadingShare(true);
      fetch(`/api/code/share/${shareId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Shared code snippet not found or expired.");
          return res.json();
        })
        .then((data: SharedSnippet) => {
          setSharedData(data);
          if (data.mode === 'generate') {
            setActiveTab('generate');
          } else {
            setActiveTab('review');
          }
        })
        .catch((err) => {
          console.error("Share load error:", err);
          setShareError(err.message);
        })
        .finally(() => {
          setLoadingShare(false);
        });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#1A1A1A] font-sans antialiased selection:bg-[#1A1A1A] selection:text-white flex flex-col justify-between">
      <div>
        {/* Navigation Bar */}
        <header className="bg-white border-b border-[#E5E2D9] sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Logo and Tagline */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#1A1A1A] text-emerald-400 flex items-center justify-center font-serif italic text-xl font-bold shadow-sm">
                CC
              </div>
              <div>
                <h1 className="text-xl font-serif italic font-bold text-[#1A1A1A] leading-none">
                  Code Companion
                </h1>
                <p className="text-[10px] font-mono text-[#666] tracking-wider uppercase mt-1">
                  Code Reviewer • Error Debugger • Solution Generator
                </p>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex flex-wrap items-center bg-[#F3F1ED] p-1 border border-[#E5E2D9]">
              <button
                onClick={() => setActiveTab('review')}
                className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center space-x-1.5 ${
                  activeTab === 'review'
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'text-[#666] hover:text-[#1A1A1A]'
                }`}
              >
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>1. Review Code</span>
              </button>

              <button
                onClick={() => setActiveTab('generate')}
                className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center space-x-1.5 ${
                  activeTab === 'generate'
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'text-[#666] hover:text-[#1A1A1A]'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>2. Ask Question -&gt; Get Code</span>
              </button>

              <button
                onClick={() => setActiveTab('files_github')}
                className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center space-x-1.5 ${
                  activeTab === 'files_github'
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'text-[#666] hover:text-[#1A1A1A]'
                }`}
              >
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>3. File &amp; GitHub Hub</span>
              </button>
            </div>
          </div>
        </header>

        {/* Shared Snippet Alert Banner */}
        {loadingShare && (
          <div className="bg-indigo-50 border-b border-indigo-200 py-2.5 px-4 text-center text-xs font-mono text-indigo-900 flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Loading shared code snippet...</span>
          </div>
        )}

        {sharedData && !loadingShare && (
          <div className="bg-amber-50 border-b border-amber-200 py-3 px-4 text-center text-xs font-mono text-amber-900 flex items-center justify-center space-x-2">
            <Share2 className="w-4 h-4 text-amber-700" />
            <span>
              Viewing Shared Code Snippet (Created: {new Date(sharedData.createdAt).toLocaleDateString()})
            </span>
            <button
              onClick={() => {
                window.history.pushState({}, '', window.location.pathname);
                setSharedData(null);
              }}
              className="ml-2 underline hover:text-[#1A1A1A] font-bold"
            >
              Reset to New Review
            </button>
          </div>
        )}

        {shareError && (
          <div className="bg-rose-50 border-b border-rose-200 py-2.5 px-4 text-center text-xs font-mono text-rose-800">
            {shareError}
          </div>
        )}

        {/* Main Application Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'review' && (
            <SimpleCodeReviewer
              initialReviewData={
                sharedData?.mode === 'review' && sharedData.reviewResult
                  ? {
                      language: sharedData.selectedLanguage,
                      code: sharedData.inputCode || '',
                      result: sharedData.reviewResult
                    }
                  : null
              }
            />
          )}

          {activeTab === 'generate' && (
            <CodeGenerator
              initialGenData={
                sharedData?.mode === 'generate' && sharedData.generationResult
                  ? {
                      language: sharedData.selectedLanguage,
                      question: sharedData.questionStatement || '',
                      result: sharedData.generationResult
                    }
                  : null
              }
            />
          )}

          {activeTab === 'files_github' && <FileAndGithubHub />}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E5E2D9] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#666] font-mono">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#1A1A1A]">Code Companion</span>
            <span>•</span>
            <span>Powered by Gemini 3.6 Flash</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>AI Engine Ready</span>
            </span>
            <span>•</span>
            <span>Select Language or Auto-Detect</span>
            <span>•</span>
            <span>Share Link Supported</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
