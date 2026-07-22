import React, { useState, useEffect, useRef } from 'react';
import { LanguageSelector } from './LanguageSelector';
import { ShareModal } from './ShareModal';
import { CodeReviewResponse, WebhookEventLog } from '../types';
import { 
  FolderPlus, 
  Github, 
  Upload, 
  Download, 
  Sparkles, 
  Play, 
  AlertTriangle, 
  CheckCircle2, 
  Code, 
  Terminal, 
  Copy, 
  Check, 
  Share2, 
  RefreshCw, 
  Webhook, 
  Key, 
  ShieldCheck, 
  ExternalLink,
  Trash2,
  Info,
  Activity,
  Send
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

export const FileAndGithubHub: React.FC = () => {
  const [subTab, setSubTab] = useState<'analyzer' | 'webhook'>('analyzer');

  // Code Analyzer State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('NOT_SURE');
  const [code, setCode] = useState<string>(`# Example Python script for file analysis
def process_data(items):
    total = 0
    for i in range(0, len(items) + 1): # Bug: index out of bounds
        total += items[i]
    return total / len(items) # Bug: potential division by zero

data = [10, 20, 30]
print("Result:", process_data(data))
`);
  const [filename, setFilename] = useState<string>('script.py');
  const [reviewResult, setReviewResult] = useState<CodeReviewResponse | null>(null);
  const [reviewing, setReviewing] = useState<boolean>(false);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'errors' | 'corrected' | 'output'>('errors');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // GitHub Repository Fetch & Upload State
  const [repoInput, setRepoInput] = useState<string>('octocat/Hello-World');
  const [filePathInput, setFilePathInput] = useState<string>('README.md');
  const [branchInput, setBranchInput] = useState<string>('master');
  const [commitMsg, setCommitMsg] = useState<string>('Updated code via Code Companion');
  const [ghLoading, setGhLoading] = useState<boolean>(false);
  const [ghStatusMsg, setGhStatusMsg] = useState<{ type: 'success' | 'error'; text: string; link?: string } | null>(null);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Webhook Configuration State
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [githubToken, setGithubToken] = useState<string>('');
  const [webhookSecret, setWebhookSecret] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState<boolean>(false);

  // Webhook Test & Logs State
  const [testingPing, setTestingPing] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<any>(null);
  const [logs, setLogs] = useState<WebhookEventLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Share state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState<boolean>(false);

  // Parse GitHub owner & repo
  const parseOwnerRepo = (input: string) => {
    let clean = input.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
    const parts = clean.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  };

  // Load Settings & Webhook info on mount
  useEffect(() => {
    fetch('/api/webhooks/info')
      .then(res => res.json())
      .then(data => {
        setWebhookUrl(data.webhookUrl || `${window.location.origin}/api/webhooks/github`);
      })
      .catch(console.error);

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.githubToken) setGithubToken(data.githubToken);
        if (data.webhookSecret) setWebhookSecret(data.webhookSecret);
      })
      .catch(console.error);

    fetchLogs();
  }, []);

  const fetchLogs = () => {
    setLoadingLogs(true);
    fetch('/api/webhooks/logs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLogs(data);
      })
      .catch(console.error)
      .finally(() => setLoadingLogs(false));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubToken,
          webhookSecret
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    const autoLang = detectLanguageFromFilename(file.name);
    setSelectedLanguage(autoLang);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCode(content);
        setReviewResult(null);
        setAnalyzerError(null);
        setGhStatusMsg({
          type: 'success',
          text: `File '${file.name}' loaded successfully!`
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFetchFromGithub = async () => {
    const parsed = parseOwnerRepo(repoInput);
    if (!parsed) {
      setGhStatusMsg({ type: 'error', text: 'Please enter a valid repository in format owner/repo.' });
      return;
    }
    if (!filePathInput.trim()) {
      setGhStatusMsg({ type: 'error', text: 'Please enter file path inside repository.' });
      return;
    }

    setGhLoading(true);
    setGhStatusMsg(null);

    try {
      const res = await fetch('/api/github/fetch-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: parsed.owner,
          repo: parsed.repo,
          path: filePathInput.trim(),
          branch: branchInput.trim() || undefined,
          token: githubToken.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch file from GitHub.');
      }

      setCode(data.content);
      setFilename(data.name || filePathInput);
      const autoLang = detectLanguageFromFilename(data.name || filePathInput);
      setSelectedLanguage(autoLang);
      setReviewResult(null);
      setGhStatusMsg({
        type: 'success',
        text: `Successfully imported '${data.name}' from ${parsed.owner}/${parsed.repo}!`,
        link: data.download_url
      });
    } catch (err: any) {
      setGhStatusMsg({ type: 'error', text: err.message || 'Error fetching file.' });
    } finally {
      setGhLoading(false);
    }
  };

  const handleCommitToGithub = async () => {
    const parsed = parseOwnerRepo(repoInput);
    if (!parsed) {
      setGhStatusMsg({ type: 'error', text: 'Please enter a valid repository in format owner/repo.' });
      return;
    }
    if (!filePathInput.trim()) {
      setGhStatusMsg({ type: 'error', text: 'Please enter file path inside repository.' });
      return;
    }
    if (!code.trim()) {
      setGhStatusMsg({ type: 'error', text: 'No code to upload. Please enter or review code first.' });
      return;
    }

    setGhLoading(true);
    setGhStatusMsg(null);

    try {
      const res = await fetch('/api/github/commit-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: parsed.owner,
          repo: parsed.repo,
          path: filePathInput.trim(),
          content: code,
          commitMessage: commitMsg.trim() || 'Updated code via Code Companion',
          branch: branchInput.trim() || undefined,
          token: githubToken.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to commit file to GitHub.');
      }

      setGhStatusMsg({
        type: 'success',
        text: data.message || `File committed successfully to ${parsed.owner}/${parsed.repo}!`,
        link: data.html_url
      });
    } catch (err: any) {
      setGhStatusMsg({ type: 'error', text: err.message || 'Error uploading file to GitHub.' });
    } finally {
      setGhLoading(false);
    }
  };

  const handleReviewCode = async () => {
    if (!code.trim()) {
      setAnalyzerError("Please upload or type code to analyze.");
      return;
    }

    setAnalyzerError(null);
    setReviewing(true);

    try {
      const res = await fetch('/api/code/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedLanguage,
          code
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed.');

      setReviewResult(data);
      if (data.hasErrors && data.errors.length > 0) {
        setActiveResultTab('errors');
      } else {
        setActiveResultTab('corrected');
      }
    } catch (err: any) {
      setAnalyzerError(err.message || 'Failed to review code.');
    } finally {
      setReviewing(false);
    }
  };

  const handleSendPing = async () => {
    setTestingPing(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'ping'
        },
        body: JSON.stringify({
          zen: 'Code Companion automated webhook active.',
          hook_id: 2026,
          repository: {
            name: repoInput || 'my-repository',
            owner: { login: 'github-user' }
          },
          sender: { login: 'github-user' }
        })
      });
      const data = await res.json();
      setPingResult({ status: res.status, data });
      fetchLogs();
    } catch (err: any) {
      setPingResult({ status: 'ERROR', error: err.message });
    } finally {
      setTestingPing(false);
    }
  };

  const handleShare = async () => {
    if (!reviewResult) return;
    setSharing(true);
    try {
      const res = await fetch('/api/code/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'review',
          selectedLanguage,
          inputCode: code,
          reviewResult
        })
      });
      const data = await res.json();
      if (res.ok && data.shareUrl) setShareUrl(data.shareUrl);
    } catch (err: any) {
      alert("Sharing error: " + err.message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Title Header */}
      <div className="bg-white border border-[#E5E2D9] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-indigo-800 font-mono block mb-1 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-indigo-600 inline mr-1" />
            <span>FILE & GITHUB INTEGRATION HUB</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif italic text-[#1A1A1A]">
            File Upload, GitHub Repository & Webhooks
          </h2>
          <p className="text-xs text-[#555] font-serif italic mt-1 max-w-2xl leading-relaxed">
            Upload local source files, fetch code directly from any GitHub repository, configure GitHub Webhooks for automated review, and commit updated code back.
          </p>
        </div>

        {/* Feature Sub-tabs */}
        <div className="flex items-center bg-[#F3F1ED] p-1 border border-[#E5E2D9]">
          <button
            onClick={() => setSubTab('analyzer')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center space-x-2 ${
              subTab === 'analyzer'
                ? 'bg-[#1A1A1A] text-white shadow-sm'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-emerald-400" />
            <span>1. File & Repo Analyzer</span>
          </button>

          <button
            onClick={() => setSubTab('webhook')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center space-x-2 ${
              subTab === 'webhook'
                ? 'bg-[#1A1A1A] text-white shadow-sm'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            <Webhook className="w-4 h-4 text-amber-400" />
            <span>2. Webhook Setup & Logs</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: FILE & GITHUB REPOSITORY CODE ANALYZER */}
      {/* ======================================================== */}
      {subTab === 'analyzer' && (
        <div className="space-y-6">
          {/* GitHub Repo Controls Bar */}
          <div className="bg-white border border-[#E5E2D9] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
              <span className="text-xs font-mono font-bold uppercase text-[#1A1A1A] flex items-center space-x-1.5">
                <Github className="w-4 h-4 text-[#1A1A1A]" />
                <span>GitHub Repository & File Operations</span>
              </span>

              {/* Local File Upload Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".py,.js,.ts,.tsx,.jsx,.cpp,.c,.java,.cs,.go,.rs,.php,.html,.css,.sql,.sh,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-xs font-mono font-bold border border-[#E5E2D9] transition-colors flex items-center space-x-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Upload Local File</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1">
                  GitHub Repository (owner/repo)
                </label>
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="e.g. octocat/Hello-World"
                  className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1">
                  File Path
                </label>
                <input
                  type="text"
                  value={filePathInput}
                  onChange={(e) => setFilePathInput(e.target.value)}
                  placeholder="e.g. src/index.js or main.py"
                  className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  placeholder="main / master"
                  className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleFetchFromGithub}
                  disabled={ghLoading}
                  className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5"
                >
                  {ghLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>Fetch Code from GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={handleCommitToGithub}
                  disabled={ghLoading}
                  className="px-4 py-2 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-xs font-mono font-bold uppercase tracking-wider border border-[#E5E2D9] transition-colors flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Upload / Commit Back to GitHub</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-[#666]">
                Loaded File: <strong className="text-[#1A1A1A]">{filename}</strong>
              </span>
            </div>

            {ghStatusMsg && (
              <div className={`p-3 text-xs font-mono border ${
                ghStatusMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center space-x-2">
                  {ghStatusMsg.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  <span>{ghStatusMsg.text}</span>
                  {ghStatusMsg.link && (
                    <a href={ghStatusMsg.link} target="_blank" rel="noopener noreferrer" className="ml-2 underline font-bold flex items-center space-x-1">
                      <span>View</span> <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Code Editor & Analyzer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Editor Box */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white border border-[#E5E2D9] p-5 shadow-sm space-y-4">
                <LanguageSelector
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  label="Programming Language"
                />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#555] font-mono">
                      File Source Code
                    </label>
                    <button
                      onClick={() => setCode('')}
                      className="text-[10px] text-[#888] hover:text-[#1A1A1A] font-mono underline"
                    >
                      Clear Code
                    </button>
                  </div>

                  <div className="bg-[#1A1A1A] border border-[#E5E2D9]">
                    <textarea
                      rows={15}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Paste, write, or upload code to analyze..."
                      className="w-full p-4 bg-[#1A1A1A] text-emerald-400 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none resize-y"
                      spellCheck={false}
                    />
                  </div>
                </div>

                {analyzerError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
                    {analyzerError}
                  </div>
                )}

                <button
                  onClick={handleReviewCode}
                  disabled={reviewing || !code.trim()}
                  className="w-full py-3.5 bg-[#1A1A1A] hover:bg-[#333] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-[0.2em] font-mono transition-all flex items-center justify-center space-x-2 shadow-md"
                >
                  {reviewing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Analyzing File Code with AI...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                      <span>Analyze File with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Analysis Output Box */}
            <div className="lg:col-span-6 space-y-4">
              {reviewResult ? (
                <div className="bg-white border border-[#E5E2D9] p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#F3F1ED] text-[#1A1A1A] border border-[#E5E2D9]">
                        Language: {reviewResult.detectedLanguage}
                      </span>
                      <h3 className="text-lg font-serif italic text-[#1A1A1A] font-bold mt-1">
                        {reviewResult.statusText}
                      </h3>
                    </div>

                    <button
                      onClick={handleShare}
                      disabled={sharing}
                      className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors flex items-center space-x-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{sharing ? 'Sharing...' : 'Share'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-serif italic text-[#333] leading-relaxed">
                    {reviewResult.summary}
                  </div>

                  {/* 3 Result Tabs */}
                  <div className="grid grid-cols-3 gap-1 bg-[#F3F1ED] p-1 border border-[#E5E2D9]">
                    <button
                      onClick={() => setActiveResultTab('errors')}
                      className={`py-2 text-xs font-bold uppercase tracking-wider font-mono ${
                        activeResultTab === 'errors' ? 'bg-[#1A1A1A] text-white' : 'text-[#666]'
                      }`}
                    >
                      Errors ({reviewResult.errors.length})
                    </button>
                    <button
                      onClick={() => setActiveResultTab('corrected')}
                      className={`py-2 text-xs font-bold uppercase tracking-wider font-mono ${
                        activeResultTab === 'corrected' ? 'bg-[#1A1A1A] text-white' : 'text-[#666]'
                      }`}
                    >
                      Corrected Code
                    </button>
                    <button
                      onClick={() => setActiveResultTab('output')}
                      className={`py-2 text-xs font-bold uppercase tracking-wider font-mono ${
                        activeResultTab === 'output' ? 'bg-[#1A1A1A] text-white' : 'text-[#666]'
                      }`}
                    >
                      Expected Output
                    </button>
                  </div>

                  {activeResultTab === 'errors' && (
                    <div className="space-y-2">
                      {reviewResult.errors.length === 0 ? (
                        <div className="p-6 text-center bg-emerald-50 border border-emerald-200 text-emerald-900 font-serif italic text-sm">
                          No errors detected! Code is clean and valid.
                        </div>
                      ) : (
                        reviewResult.errors.map((err, idx) => (
                          <div key={idx} className="p-3 bg-white border border-rose-200 space-y-1">
                            <div className="flex justify-between font-bold text-xs font-mono text-rose-900">
                              <span>{err.title}</span>
                              <span>Line {err.lineNumber || 'N/A'}</span>
                            </div>
                            <p className="text-xs text-[#333] font-serif">{err.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeResultTab === 'corrected' && (
                    <pre className="p-4 bg-[#1A1A1A] text-emerald-300 font-mono text-xs overflow-x-auto max-h-[350px] whitespace-pre-wrap border border-[#E5E2D9]">
                      <code>{reviewResult.correctedCode}</code>
                    </pre>
                  )}

                  {activeResultTab === 'output' && (
                    <pre className="p-4 bg-[#0F172A] text-sky-300 font-mono text-xs overflow-x-auto max-h-[300px] whitespace-pre-wrap border border-[#E5E2D9]">
                      <code>{reviewResult.expectedOutput}</code>
                    </pre>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-[#E5E2D9] p-12 text-center text-[#666] space-y-3 shadow-sm h-full flex flex-col items-center justify-center min-h-[380px]">
                  <Code className="w-8 h-8 text-[#AAA]" />
                  <h4 className="text-lg font-serif italic text-[#1A1A1A]">Ready for File Code Analysis</h4>
                  <p className="text-xs text-[#666] max-w-xs leading-relaxed">
                    Upload a file or fetch from GitHub on the left, then click "Analyze File with AI".
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: GITHUB WEBHOOK SETUP & REAL-TIME LOGS */}
      {/* ======================================================== */}
      {subTab === 'webhook' && (
        <div className="space-y-6">
          {/* Webhook Configuration Banner */}
          <div className="bg-white border border-[#E5E2D9] p-6 shadow-sm space-y-5">
            <div className="flex items-center space-x-3 border-b border-[#E5E2D9] pb-3">
              <span className="p-2 bg-[#1A1A1A] text-amber-400">
                <Webhook className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-serif italic font-bold text-xl text-[#1A1A1A]">
                  GitHub Webhook Setup & Credentials
                </h3>
                <p className="text-xs text-[#666] font-mono">
                  Configure your GitHub Webhook Secret and Personal Access Token for automated PR code reviews
                </p>
              </div>
            </div>

            {/* Step 1: Payload URL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider font-mono text-[#555] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                <span>GitHub Webhook Payload URL</span>
              </label>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2.5 text-[#1A1A1A] focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    setCopiedWebhookUrl(true);
                    setTimeout(() => setCopiedWebhookUrl(false), 2500);
                  }}
                  className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-wider font-mono transition-colors flex items-center space-x-1.5 shrink-0"
                >
                  {copiedWebhookUrl ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied URL</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Payload URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Webhook Secret & GitHub Token Input */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider font-mono text-[#555] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                <span>Provide Your GitHub Secret & Token</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                    <span>GitHub Webhook Secret</span>
                  </label>
                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Enter webhook secret (e.g. my-secret-passphrase)"
                    className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                  <p className="text-[10px] text-[#888] mt-1 font-mono">
                    Used to verify HMAC-SHA256 signatures from GitHub.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1 flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>GitHub Personal Access Token (PAT)</span>
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_************************************"
                    className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                  <p className="text-[10px] text-[#888] mt-1 font-mono">
                    Required to automatically post AI comments on GitHub PRs.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors flex items-center space-x-2"
                >
                  {savingSettings ? (
                    <span>Saving Credentials...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Save Credentials</span>
                    </>
                  )}
                </button>

                {saveSuccess && (
                  <span className="text-xs font-mono text-emerald-700 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Credentials saved successfully!</span>
                  </span>
                )}

                <button
                  onClick={handleSendPing}
                  disabled={testingPing}
                  className="px-4 py-2.5 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-xs font-bold font-mono uppercase tracking-wider border border-[#E5E2D9] transition-colors flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Send Test Webhook Ping</span>
                </button>
              </div>

              {pingResult && (
                <div className="p-3 bg-[#1A1A1A] text-emerald-400 font-mono text-xs overflow-x-auto border border-[#E5E2D9]">
                  Response Status: {pingResult.status}
                  <pre>{JSON.stringify(pingResult.data || pingResult.error, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Step 3: Instructions Box */}
            <div className="p-4 bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-serif italic text-[#333] space-y-2">
              <h4 className="font-sans text-[10px] font-mono font-bold uppercase tracking-widest text-[#555] not-italic flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-indigo-700" />
                <span>How to Add Webhook in GitHub Repository</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1 font-sans text-xs not-italic text-[#444] leading-relaxed">
                <li>Go to your GitHub repository &rarr; <strong>Settings</strong> &rarr; <strong>Webhooks</strong> &rarr; <strong>Add webhook</strong>.</li>
                <li>Paste the <strong>Payload URL</strong> copied above.</li>
                <li>Set <strong>Content type</strong> to <code>application/json</code>.</li>
                <li>Enter your <strong>Secret</strong> matching the webhook secret saved above.</li>
                <li>Select event: <strong>Let me select individual events &rarr; Pull requests</strong>, then click <strong>Add webhook</strong>.</li>
              </ol>
            </div>
          </div>

          {/* Webhook Event Logs Table */}
          <div className="bg-white border border-[#E5E2D9] shadow-sm space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
              <span className="text-xs font-mono font-bold uppercase text-[#1A1A1A] flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-indigo-700" />
                <span>Webhook Event Logs & Automated Reviews</span>
              </span>

              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="px-3 py-1 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-xs font-mono font-bold border border-[#E5E2D9] transition-colors flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin text-amber-600' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="p-10 text-center text-[#666] space-y-2 font-serif italic">
                <p>No webhook events recorded yet.</p>
                <p className="text-xs text-[#888] font-sans not-italic font-mono">
                  Click "Send Test Webhook Ping" above or create a Pull Request in your GitHub repository.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-[#F3F1ED] text-[#666] border-b border-[#E5E2D9] text-[10px] uppercase">
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Event</th>
                      <th className="p-2.5">Repository</th>
                      <th className="p-2.5">Sender</th>
                      <th className="p-2.5">Signature</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E2D9]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F9F8F6]">
                        <td className="p-2.5 text-[#666]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="p-2.5 font-bold text-[#1A1A1A]">{log.event} {log.action ? `(${log.action})` : ''}</td>
                        <td className="p-2.5 text-indigo-800 font-bold">{log.repoOwner}/{log.repoName}</td>
                        <td className="p-2.5 text-[#333]">@{log.sender}</td>
                        <td className="p-2.5">
                          {log.signatureValid ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 font-bold border border-emerald-200">Verified</span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 font-bold border border-rose-200">Unverified</span>
                          )}
                        </td>
                        <td className="p-2.5 text-[#333]">{log.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareUrl && (
        <ShareModal shareUrl={shareUrl} onClose={() => setShareUrl(null)} />
      )}
    </div>
  );
};
