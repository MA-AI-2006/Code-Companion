import React, { useState } from 'react';
import { LanguageSelector } from './LanguageSelector';
import { ShareModal } from './ShareModal';
import { GitHubRepoModal } from './GitHubRepoModal';
import { CodeGenerationResponse } from '../types';
import { 
  Sparkles, 
  HelpCircle, 
  Send, 
  Code2, 
  Terminal, 
  Copy, 
  Check, 
  Share2, 
  RefreshCw, 
  BookOpen,
  Github
} from 'lucide-react';

const QUESTION_PRESETS = [
  {
    label: 'Python: Reverse String & Count Vowels',
    language: 'Python',
    question: 'Write a Python function that takes a string input, reverses it, and counts the number of vowels (a, e, i, o, u) ignoring case sensitivity. Include sample test calls.'
  },
  {
    label: 'JavaScript: Binary Search Algorithm',
    language: 'JavaScript',
    question: 'Write a JavaScript function that implements Binary Search on a sorted array of numbers. Return the index if found or -1 if not found, with comments explaining time complexity.'
  },
  {
    label: 'C++: Linked List Node Inversion',
    language: 'C++',
    question: 'Write a C++ class for a singly linked list with a method to reverse the list in-place and print all elements.'
  },
  {
    label: 'SQL: Find Top 3 High Spenders',
    language: 'SQL',
    question: 'Write a SQL query to select the top 3 customers who spent the most money in 2025 by joining customers and orders tables.'
  }
];

interface CodeGeneratorProps {
  initialGenData?: {
    language: string;
    question: string;
    result: CodeGenerationResponse;
  } | null;
}

export const CodeGenerator: React.FC<CodeGeneratorProps> = ({ initialGenData }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    initialGenData?.language || 'Python'
  );
  const [question, setQuestion] = useState<string>(
    initialGenData?.question || QUESTION_PRESETS[0].question
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [genResult, setGenResult] = useState<CodeGenerationResponse | null>(
    initialGenData?.result || null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Copy state
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Share state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState<boolean>(false);

  // GitHub Modal state
  const [showGithubModal, setShowGithubModal] = useState<boolean>(false);

  const handleGenerateCode = async () => {
    if (!question.trim()) {
      setErrorMsg("Please enter your question statement or problem description.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/code/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedLanguage,
          question
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server error while generating code.');
      }

      setGenResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (codeToCopy: string) => {
    navigator.clipboard.writeText(codeToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleShare = async () => {
    if (!genResult) return;
    setSharing(true);
    try {
      const res = await fetch('/api/code/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          selectedLanguage,
          questionStatement: question,
          generationResult: genResult
        })
      });
      const data = await res.json();
      if (res.ok && data.shareUrl) {
        setShareUrl(data.shareUrl);
      } else {
        alert("Could not generate share link: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Sharing error: " + err.message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-[#E5E2D9] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-indigo-800 font-mono block mb-1 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-indigo-600 inline mr-1" />
            <span>AI CODE GENERATOR</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif italic text-[#1A1A1A]">
            Ask Question Statement &rarr; Get Code
          </h2>
          <p className="text-xs text-[#555] font-serif italic mt-1 max-w-2xl leading-relaxed">
            Enter any programming task or question statement in your chosen language. The AI will write clean, well-commented code, explain how it works, and show expected output.
          </p>
        </div>

        {/* Quick Question Presets */}
        <div className="w-full md:w-auto shrink-0">
          <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1">
            Try Sample Questions:
          </label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedLanguage(preset.language);
                  setQuestion(preset.question);
                  setGenResult(null);
                  setErrorMsg(null);
                }}
                className="px-2.5 py-1.5 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-[11px] font-medium border border-[#E5E2D9] transition-colors font-mono"
              >
                {preset.label.split(':')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question Input */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E5E2D9] p-5 shadow-sm space-y-4">
            {/* Language Selector */}
            <LanguageSelector
              value={selectedLanguage}
              onChange={(val) => {
                setSelectedLanguage(val);
                setGenResult(null);
              }}
              label="Select Target Language for Solution"
            />

            {/* Question Text Area */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#555] font-mono flex items-center justify-between">
                <span>Question Statement or Problem Description</span>
              </label>

              <textarea
                rows={10}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your programming task or question here... (e.g. Write a function that finds duplicate words in a sentence)"
                className="w-full p-4 bg-[#F9F8F6] border border-[#E5E2D9] text-[#1A1A1A] font-serif text-sm leading-relaxed focus:outline-none focus:border-[#1A1A1A] transition-colors resize-y"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleGenerateCode}
              disabled={loading || !question.trim()}
              className="w-full py-3.5 bg-[#1A1A1A] hover:bg-[#333] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-[0.2em] font-mono transition-all flex items-center justify-center space-x-2 shadow-md"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Writing Code Solution...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Generate Code with AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Generated Code Solution */}
        <div className="lg:col-span-7 space-y-4">
          {genResult ? (
            <div className="bg-white border border-[#E5E2D9] p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#F3F1ED] text-[#1A1A1A] border border-[#E5E2D9]">
                    Generated Solution: {genResult.language}
                  </span>
                  <h3 className="text-xl font-serif italic text-[#1A1A1A] font-bold mt-1">
                    AI Generated Code Solution
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowGithubModal(true)}
                    className="px-3 py-1.5 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-xs font-bold font-mono uppercase tracking-wider transition-colors border border-[#E5E2D9] flex items-center space-x-1"
                  >
                    <Github className="w-3.5 h-3.5 text-amber-600" />
                    <span>Upload to GitHub</span>
                  </button>

                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors flex items-center space-x-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{sharing ? 'Generating...' : 'Share Code'}</span>
                  </button>
                </div>
              </div>

              {/* Code Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-[#1A1A1A] px-4 py-2 border-b border-[#333]">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-emerald-400 flex items-center space-x-1">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{genResult.language} Code</span>
                  </span>

                  <button
                    onClick={() => handleCopyCode(genResult.generatedCode)}
                    className="text-xs font-mono text-white hover:text-emerald-400 flex items-center space-x-1 transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 bg-[#1A1A1A] text-emerald-300 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed whitespace-pre-wrap border border-[#E5E2D9]">
                  <code>{genResult.generatedCode}</code>
                </pre>
              </div>

              {/* Explanation Box */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-[#555] flex items-center space-x-1">
                  <BookOpen className="w-4 h-4 text-indigo-700" />
                  <span>How This Code Works (Step-by-Step)</span>
                </h4>
                <div className="p-4 bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-serif italic text-[#222] leading-relaxed whitespace-pre-wrap">
                  {genResult.explanation}
                </div>
              </div>

              {/* Expected Output Box */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-[#555] flex items-center space-x-1">
                  <Terminal className="w-4 h-4 text-emerald-700" />
                  <span>Expected Execution Output</span>
                </h4>
                <pre className="p-4 bg-[#0F172A] text-sky-300 font-mono text-xs overflow-x-auto max-h-[220px] leading-relaxed whitespace-pre-wrap border border-[#E5E2D9]">
                  <code>{genResult.expectedOutput}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E2D9] p-12 text-center text-[#666] space-y-4 shadow-sm h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 rounded-full bg-[#F3F1ED] flex items-center justify-center text-[#1A1A1A] mx-auto border border-[#E5E2D9]">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-serif italic text-[#1A1A1A]">Ready to Generate Code Solution</h4>
                <p className="text-xs text-[#666] max-w-sm mx-auto leading-relaxed">
                  Type a question statement or task on the left and click "Generate Code with AI".
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareUrl && (
        <ShareModal shareUrl={shareUrl} onClose={() => setShareUrl(null)} />
      )}

      {/* GitHub Repository Modal */}
      {showGithubModal && (
        <GitHubRepoModal
          currentCode={genResult?.generatedCode || ''}
          onFileFetched={() => {}}
          onClose={() => setShowGithubModal(false)}
        />
      )}
    </div>
  );
};
