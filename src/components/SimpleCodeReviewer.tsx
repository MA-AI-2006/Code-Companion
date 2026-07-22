import React, { useState, useRef } from 'react';
import { LanguageSelector } from './LanguageSelector';
import { ShareModal } from './ShareModal';
import { GitHubRepoModal } from './GitHubRepoModal';
import { safeFetchJson } from '../lib/fetchUtils';
import { CodeReviewResponse } from '../types';
import { 
  Play, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Code, 
  Terminal, 
  Copy, 
  Check, 
  Share2, 
  RefreshCw,
  Zap,
  Info,
  FolderPlus,
  Github,
  Trash2
} from 'lucide-react';

function detectLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py': return 'Python';
    case 'js': case 'jsx': case 'mjs': return 'JavaScript';
    case 'ts': case 'tsx': return 'TypeScript';
    case 'cpp': case 'cc': case 'cxx': case 'h': case 'hpp': return 'C++';
    case 'c': return 'C';
    case 'java': return 'Java';
    case 'cs': return 'C#';
    case 'go': return 'Go';
    case 'rs': return 'Rust';
    case 'php': return 'PHP';
    case 'html': case 'css': return 'HTML/CSS';
    case 'sql': return 'SQL';
    case 'rb': return 'Ruby';
    case 'swift': return 'Swift';
    case 'kt': return 'Kotlin';
    case 'sh': case 'bash': return 'Shell';
    default: return 'NOT_SURE';
  }
}

const SAMPLE_CODE_PRESETS = [
  {
    label: 'Python (Division & Off-by-one bug)',
    language: 'Python',
    code: `# Calculate average of numbers and find primes
def calculate_average(nums):
    total = 0
    for i in range(0, len(nums)):
        total += nums[i]
    return total / len(nums)  # What if nums is empty?

def get_first_elements(items, count):
    result = []
    for i in range(count + 1):  # Off by one error!
        result.append(items[i])
    return result

numbers = [10, 20, 30]
print("Average:", calculate_average(numbers))
print("Items:", get_first_elements(["A", "B", "C"], 2))
`
  },
  {
    label: 'JavaScript (Unresolved Async & Syntax bug)',
    language: 'JavaScript',
    code: `// Fetch user data and format name
async function getUserData(userId) {
    const response = fetch('https://api.example.com/users/' + userId);
    const data = response.json(); // Missing await!
    return data.name.toUpperCase(); // TypeError: Cannot read properties of undefined
}

function processUsers(users) {
    for (let i = 0; i <= users.length; i++) { // Bug: out of bounds index
        console.log("User:", users[i].name)
    }
}

getUserData(101).then(name => console.log("Name:", name));
`
  },
  {
    label: 'C++ (Memory Leak & Uninitialized Pointer)',
    language: 'C++',
    code: `#include <iostream>

class ArrayBuffer {
    int* data;
    int size;
public:
    ArrayBuffer(int s) {
        size = s;
        data = new int[s]; // Allocated memory
    }
    // Bug: Missing destructor ~ArrayBuffer() -> Memory leak!

    void print() {
        for(int i = 0; i <= size; i++) { // Bug: out of bounds access
            std::cout << data[i] << " ";
        }
    }
};

int main() {
    ArrayBuffer buf(5);
    buf.print();
    return 0;
}
`
  },
  {
    label: 'Unknown Language (AI Language Auto-Detection)',
    language: 'NOT_SURE',
    code: `// Auto-detect language
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().fold(0, |acc, x| acc + x);
    println!("Sum of vector: {}", sum);
}
`
  }
];

interface SimpleCodeReviewerProps {
  initialReviewData?: {
    language: string;
    code: string;
    result: CodeReviewResponse;
  } | null;
}

export const SimpleCodeReviewer: React.FC<SimpleCodeReviewerProps> = ({ initialReviewData }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    initialReviewData?.language || 'NOT_SURE'
  );
  const [inputCode, setInputCode] = useState<string>(
    initialReviewData?.code || SAMPLE_CODE_PRESETS[0].code
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<CodeReviewResponse | null>(
    initialReviewData?.result || null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active view tab in results: 'errors' | 'corrected' | 'output'
  const [activeTab, setActiveTab] = useState<'errors' | 'corrected' | 'output'>('errors');

  // Copy state
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Share state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState<boolean>(false);

  // GitHub Modal state & File upload ref
  const [showGithubModal, setShowGithubModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const autoLang = detectLanguageFromFilename(file.name);
    setSelectedLanguage(autoLang);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setInputCode(content);
        setReviewResult(null);
        setErrorMsg(null);
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  const handleReviewCode = async () => {
    if (!inputCode.trim()) {
      setErrorMsg("Please type or paste your code snippet before reviewing.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const data = await safeFetchJson('/api/code/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedLanguage,
          code: inputCode
        })
      });

      setReviewResult(data);
      // Automatically switch to errors tab if errors exist, else corrected code
      if (data.hasErrors && data.errors.length > 0) {
        setActiveTab('errors');
      } else {
        setActiveTab('corrected');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to review code. Please try again.');
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
    if (!reviewResult) return;
    setSharing(true);
    try {
      const data = await safeFetchJson('/api/code/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'review',
          selectedLanguage,
          inputCode,
          reviewResult
        })
      });
      if (data.shareUrl) {
        setShareUrl(data.shareUrl);
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
          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-amber-800 font-mono block mb-1 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-600 inline mr-1" />
            <span>AI CODE REVIEWER</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif italic text-[#1A1A1A]">
            Select Language & Inspect Code
          </h2>
          <p className="text-xs text-[#555] font-serif italic mt-1 max-w-2xl leading-relaxed">
            Paste your source code in any language (or select "Not sure" for automatic language detection). The AI will review for bugs, explain errors, provide the corrected code, and show expected output.
          </p>
        </div>

        {/* Quick presets dropdown */}
        <div className="w-full md:w-auto shrink-0">
          <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1">
            Try Sample Presets:
          </label>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_CODE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedLanguage(preset.language);
                  setInputCode(preset.code);
                  setReviewResult(null);
                  setErrorMsg(null);
                }}
                className="px-2.5 py-1.5 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-[11px] font-medium border border-[#E5E2D9] transition-colors font-mono"
              >
                {preset.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Input & Review Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Code Input */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-[#E5E2D9] p-5 shadow-sm space-y-4">
            {/* Language Selector */}
            <LanguageSelector
              value={selectedLanguage}
              onChange={(val) => {
                setSelectedLanguage(val);
                setReviewResult(null);
              }}
            />

            {/* Code Input Box Header & Actions */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#555] font-mono">
                  Your Source Code
                </label>

                {/* Import/Upload Toolbar */}
                <div className="flex items-center space-x-1.5">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".py,.js,.ts,.tsx,.jsx,.cpp,.c,.java,.cs,.go,.rs,.php,.html,.css,.sql,.sh,.txt,.json"
                    className="hidden"
                  />

                  {/* Local File Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-[11px] font-mono font-bold border border-[#E5E2D9] transition-colors flex items-center space-x-1"
                    title="Upload local code file (.py, .js, .ts, .cpp, etc.)"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Upload File</span>
                  </button>

                  {/* GitHub Repo Button */}
                  <button
                    type="button"
                    onClick={() => setShowGithubModal(true)}
                    className="px-2.5 py-1 bg-[#1A1A1A] hover:bg-[#333] text-white text-[11px] font-mono font-bold transition-colors flex items-center space-x-1"
                    title="Fetch from GitHub or Upload Code to GitHub Repository"
                  >
                    <Github className="w-3.5 h-3.5 text-amber-400" />
                    <span>GitHub Repo</span>
                  </button>

                  {/* Clear Button */}
                  <button
                    type="button"
                    onClick={() => setInputCode('')}
                    className="p-1 text-[#888] hover:text-[#1A1A1A] font-mono hover:bg-[#F3F1ED] transition-colors"
                    title="Clear editor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="relative border border-[#E5E2D9] focus-within:border-[#1A1A1A] transition-colors bg-[#1A1A1A]">
                <textarea
                  rows={14}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Paste, write, or upload your code file here..."
                  className="w-full p-4 bg-[#1A1A1A] text-emerald-400 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none resize-y selection:bg-emerald-900 selection:text-white"
                  spellCheck={false}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleReviewCode}
              disabled={loading || !inputCode.trim()}
              className="w-full py-3.5 bg-[#1A1A1A] hover:bg-[#333] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-[0.2em] font-mono transition-all flex items-center justify-center space-x-2 shadow-md"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Analyzing Code & Detecting Errors...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>Review Code with AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Review Results */}
        <div className="lg:col-span-6 space-y-4">
          {reviewResult ? (
            <div className="bg-white border border-[#E5E2D9] p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
              {/* Header Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E2D9] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#F3F1ED] text-[#1A1A1A] border border-[#E5E2D9]">
                      Language: {reviewResult.detectedLanguage}
                    </span>
                    {selectedLanguage === 'NOT_SURE' && (
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-200">
                        AI Detected
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-serif italic text-[#1A1A1A] mt-1 font-bold">
                    {reviewResult.statusText}
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider font-mono border flex items-center space-x-1 ${
                    reviewResult.hasErrors
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {reviewResult.hasErrors ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Needs Fixes</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Code Correct</span>
                      </>
                    )}
                  </span>

                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors flex items-center space-x-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{sharing ? 'Generating...' : 'Share'}</span>
                  </button>
                </div>
              </div>

              {/* Summary explanation */}
              <div className="p-4 bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-serif italic text-[#333] leading-relaxed">
                <div className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#666] not-italic mb-1 font-mono flex items-center space-x-1">
                  <Info className="w-3 h-3 text-indigo-700" />
                  <span>AI Review Summary</span>
                </div>
                {reviewResult.summary}
              </div>

              {/* 3 Interactive Result Option Tabs as explicitly requested */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-1 bg-[#F3F1ED] p-1 border border-[#E5E2D9]">
                  <button
                    onClick={() => setActiveTab('errors')}
                    className={`py-2 px-3 text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center justify-center space-x-1.5 ${
                      activeTab === 'errors'
                        ? 'bg-[#1A1A1A] text-white shadow-sm'
                        : 'text-[#666] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === 'errors' ? 'text-rose-400' : 'text-rose-600'}`} />
                    <span>See Errors ({reviewResult.errors.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('corrected')}
                    className={`py-2 px-3 text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center justify-center space-x-1.5 ${
                      activeTab === 'corrected'
                        ? 'bg-[#1A1A1A] text-white shadow-sm'
                        : 'text-[#666] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <Code className={`w-3.5 h-3.5 ${activeTab === 'corrected' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>Corrected Code</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('output')}
                    className={`py-2 px-3 text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center justify-center space-x-1.5 ${
                      activeTab === 'output'
                        ? 'bg-[#1A1A1A] text-white shadow-sm'
                        : 'text-[#666] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <Terminal className={`w-3.5 h-3.5 ${activeTab === 'output' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <span>Expected Output</span>
                  </button>
                </div>

                {/* Tab 1: SEE ERRORS */}
                {activeTab === 'errors' && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    {reviewResult.errors.length === 0 ? (
                      <div className="p-8 text-center bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                        <h4 className="font-serif italic font-bold text-lg">No Syntax or Logic Errors Detected!</h4>
                        <p className="text-xs text-emerald-800">
                          Your code is clean and properly formatted according to {reviewResult.detectedLanguage} conventions.
                        </p>
                      </div>
                    ) : (
                      reviewResult.errors.map((err, idx) => (
                        <div key={idx} className="p-4 bg-white border border-rose-200 shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs font-mono text-rose-900 flex items-center space-x-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>{err.title}</span>
                            </span>

                            <div className="flex items-center space-x-2">
                              {err.lineNumber && (
                                <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 border border-rose-300">
                                  Line {err.lineNumber}
                                </span>
                              )}
                              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 ${
                                err.severity === 'CRITICAL' ? 'bg-rose-800 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}>
                                {err.severity}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-[#333] font-serif leading-relaxed">
                            {err.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 2: SEE CORRECTED CODE */}
                {activeTab === 'corrected' && (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between bg-[#1A1A1A] px-4 py-2 border-b border-[#333]">
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-emerald-400">
                        {reviewResult.detectedLanguage} // Fixed Code
                      </span>

                      <button
                        onClick={() => handleCopyCode(reviewResult.correctedCode)}
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

                    <pre className="p-4 bg-[#1A1A1A] text-emerald-300 font-mono text-xs overflow-x-auto max-h-[400px] leading-relaxed whitespace-pre-wrap border border-[#E5E2D9]">
                      <code>{reviewResult.correctedCode}</code>
                    </pre>
                  </div>
                )}

                {/* Tab 3: SEE EXPECTED OUTPUT */}
                {activeTab === 'output' && (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between bg-[#1A1A1A] px-4 py-2 border-b border-[#333]">
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-400 flex items-center space-x-1">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Terminal Execution Console Output</span>
                      </span>
                    </div>

                    <pre className="p-4 bg-[#0F172A] text-sky-300 font-mono text-xs overflow-x-auto max-h-[350px] leading-relaxed whitespace-pre-wrap border border-[#E5E2D9]">
                      <code>{reviewResult.expectedOutput}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E2D9] p-12 text-center text-[#666] space-y-4 shadow-sm h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 rounded-full bg-[#F3F1ED] flex items-center justify-center text-[#1A1A1A] mx-auto border border-[#E5E2D9]">
                <Code className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-serif italic text-[#1A1A1A]">Ready for AI Code Review</h4>
                <p className="text-xs text-[#666] max-w-sm mx-auto leading-relaxed">
                  Select a language or leave as "Not sure", paste your code on the left, and click "Review Code with AI".
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

      {/* GitHub Repository Import / Upload Modal */}
      {showGithubModal && (
        <GitHubRepoModal
          currentCode={inputCode}
          onFileFetched={(fetchedCode, filename) => {
            setInputCode(fetchedCode);
            const lang = detectLanguageFromFilename(filename);
            setSelectedLanguage(lang);
            setReviewResult(null);
            setErrorMsg(null);
          }}
          onClose={() => setShowGithubModal(false)}
        />
      )}
    </div>
  );
};
