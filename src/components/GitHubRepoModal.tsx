import React, { useState } from 'react';
import { Github, Upload, Download, Check, X, AlertTriangle, ExternalLink, RefreshCw, Key } from 'lucide-react';

interface GitHubRepoModalProps {
  currentCode: string;
  onFileFetched: (content: string, filename: string) => void;
  onClose: () => void;
}

export const GitHubRepoModal: React.FC<GitHubRepoModalProps> = ({
  currentCode,
  onFileFetched,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'fetch' | 'upload'>('fetch');

  // Common GitHub fields
  const [repoUrlOrOwner, setRepoUrlOrOwner] = useState<string>('octocat/Hello-World');
  const [filePath, setFilePath] = useState<string>('README.md');
  const [branch, setBranch] = useState<string>('master');
  const [token, setToken] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState<string>('Updated code via Code Companion');

  // Loading & Status states
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ message: string; html_url?: string } | null>(null);

  // Helper to parse "owner/repo" or "https://github.com/owner/repo"
  const parseOwnerRepo = (input: string) => {
    let clean = input.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
    const parts = clean.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  };

  const handleFetchFromGitHub = async () => {
    const parsed = parseOwnerRepo(repoUrlOrOwner);
    if (!parsed) {
      setErrorMsg("Please enter a valid GitHub repository in format 'owner/repo' or full URL.");
      return;
    }
    if (!filePath.trim()) {
      setErrorMsg("Please enter the file path within the repository (e.g., src/index.js or main.py).");
      return;
    }

    setErrorMsg(null);
    setSuccessResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/github/fetch-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: parsed.owner,
          repo: parsed.repo,
          path: filePath.trim(),
          branch: branch.trim() || undefined,
          token: token.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch file from GitHub repository.');
      }

      onFileFetched(data.content, data.name || filePath);
      setSuccessResult({
        message: `Successfully imported '${data.name}' from ${parsed.owner}/${parsed.repo}!`,
        html_url: data.download_url
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching file from GitHub.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitToGitHub = async () => {
    const parsed = parseOwnerRepo(repoUrlOrOwner);
    if (!parsed) {
      setErrorMsg("Please enter a valid GitHub repository in format 'owner/repo' or full URL.");
      return;
    }
    if (!filePath.trim()) {
      setErrorMsg("Please enter target file path (e.g. main.py or src/App.js).");
      return;
    }
    if (!currentCode.trim()) {
      setErrorMsg("No code to upload! Please enter or generate code first.");
      return;
    }

    setErrorMsg(null);
    setSuccessResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/github/commit-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: parsed.owner,
          repo: parsed.repo,
          path: filePath.trim(),
          content: currentCode,
          commitMessage: commitMessage.trim() || 'Upload code via Code Companion',
          branch: branch.trim() || undefined,
          token: token.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload file to GitHub repository.');
      }

      setSuccessResult({
        message: data.message || `File successfully uploaded to ${parsed.owner}/${parsed.repo}!`,
        html_url: data.html_url
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error committing file to GitHub.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#E5E2D9] max-w-lg w-full shadow-2xl p-6 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-[#1A1A1A] text-white">
              <Github className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-serif italic font-bold text-xl text-[#1A1A1A]">
                GitHub Repository Integration
              </h3>
              <p className="text-[10px] font-mono text-[#666]">
                Fetch repository files or upload code directly to GitHub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#888] hover:text-[#1A1A1A] hover:bg-[#F3F1ED] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-[#F3F1ED] p-1 border border-[#E5E2D9]">
          <button
            onClick={() => {
              setActiveTab('fetch');
              setErrorMsg(null);
              setSuccessResult(null);
            }}
            className={`py-2 text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'fetch'
                ? 'bg-[#1A1A1A] text-white shadow-sm'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>1. Fetch Code File</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('upload');
              setErrorMsg(null);
              setSuccessResult(null);
            }}
            className={`py-2 text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'upload'
                ? 'bg-[#1A1A1A] text-white shadow-sm'
                : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>2. Upload / Commit Code</span>
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1">
              GitHub Repository (owner/repo or URL)
            </label>
            <input
              type="text"
              value={repoUrlOrOwner}
              onChange={(e) => setRepoUrlOrOwner(e.target.value)}
              placeholder="e.g. facebook/react or https://github.com/myuser/myrepo"
              className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1">
                File Path in Repository
              </label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="e.g. src/App.js or main.py"
                className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1">
                Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main / master"
                className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>
          </div>

          {activeTab === 'upload' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1">
                Commit Message
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Upload code via Code Companion"
                className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666] mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Key className="w-3 h-3 text-[#666]" />
                <span>GitHub Personal Access Token (PAT)</span>
              </span>
              <span className="text-[9px] text-[#888] lowercase font-normal">
                {activeTab === 'upload' ? 'required for upload' : 'optional for public repos'}
              </span>
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_************************************"
              className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successResult.message}</span>
            </div>
            {successResult.html_url && (
              <a
                href={successResult.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-800 hover:underline inline-flex items-center space-x-1 font-semibold text-[11px]"
              >
                <span>View on GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-2 border-t border-[#E5E2D9] flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider font-mono"
          >
            Close
          </button>

          {activeTab === 'fetch' ? (
            <button
              onClick={handleFetchFromGitHub}
              disabled={loading}
              className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-wider font-mono transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Fetch File Content</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleCommitToGitHub}
              disabled={loading}
              className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-wider font-mono transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Upload / Commit to GitHub</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
