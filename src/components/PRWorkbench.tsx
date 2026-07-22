import React, { useState } from 'react';
import { SAMPLE_PRS } from '../data/samplePRs';
import { ReviewResult, SamplePR } from '../types';
import { ReviewDashboard } from './ReviewDashboard';
import { DiffViewer } from './DiffViewer';
import { Sparkles, GitPullRequest, Code2, Play, FileCode, ShieldAlert, Cpu, RefreshCw, Search, ArrowRight, CornerDownRight } from 'lucide-react';

interface PRWorkbenchProps {
  onReviewCompleted?: (result: ReviewResult) => void;
}

export const PRWorkbench: React.FC<PRWorkbenchProps> = ({ onReviewCompleted }) => {
  const [selectedSample, setSelectedSample] = useState<SamplePR>(SAMPLE_PRS[0]);
  const [activeMode, setActiveMode] = useState<'sample' | 'custom' | 'github'>('sample');
  
  // Custom inputs
  const [customTitle, setCustomTitle] = useState<string>('feat: Add user profile management and data caching');
  const [customFilename, setCustomFilename] = useState<string>('src/services/userService.ts');
  const [customPatch, setCustomPatch] = useState<string>(`@@ -1,10 +1,25 @@
 import db from '../db';

+const SECRET_TOKEN = "sk-live-998877665544332211";

 export async function getUserData(userId: string) {
-  return db.query('SELECT * FROM users WHERE id = $1', [userId]);
+  // Raw query vulnerability
+  const user = await db.raw("SELECT * FROM users WHERE id = '" + userId + "'");
  
+  // Unhandled dynamic execution
+  eval(req.body.customScript);
  
  return user;
 }`);

  // GitHub URL input
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [fetchingGithub, setFetchingGithub] = useState<boolean>(false);

  // Review execution state
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<ReviewResult | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'diff'>('dashboard');

  const handleRunReview = async () => {
    setAnalyzing(true);
    setAnalysisStep('1/3 Scanning code with AST Static Linter rules...');

    let filesPayload: { filename: string; patch: string; content?: string }[] = [];
    let prTitle = '';
    let prNumber = 1;
    let repoOwner = 'acme-corp';
    let repoName = 'app';
    let author = 'dev';
    let headBranch = 'feature';
    let baseBranch = 'main';
    let commitSha = '7f9a2e1';

    if (activeMode === 'sample') {
      filesPayload = selectedSample.files;
      prTitle = selectedSample.title;
      prNumber = selectedSample.pullNumber;
      repoOwner = selectedSample.repoOwner;
      repoName = selectedSample.repoName;
      author = selectedSample.author;
      headBranch = selectedSample.headBranch;
      baseBranch = selectedSample.baseBranch;
      commitSha = selectedSample.commitSha;
    } else {
      filesPayload = [{
        filename: customFilename || 'src/app.ts',
        patch: customPatch,
        content: customPatch
      }];
      prTitle = customTitle;
    }

    try {
      setTimeout(() => {
        setAnalysisStep('2/3 Reasoning with Gemini 3.6 Flash LLM Engine...');
      }, 700);

      const res = await fetch('/api/review/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prTitle,
          prNumber,
          repoOwner,
          repoName,
          author,
          headBranch,
          baseBranch,
          commitSha,
          files: filesPayload
        })
      });

      setAnalysisStep('3/3 Correlating inline comments and severity scores...');
      const reviewData: ReviewResult = await res.json();

      if (!res.ok) {
        throw new Error((reviewData as any).error || 'Failed analyzing code');
      }

      setCurrentResult(reviewData);
      if (onReviewCompleted) onReviewCompleted(reviewData);
    } catch (err: any) {
      console.error("Error analyzing PR:", err);
      alert("Review analysis error: " + err.message);
    } finally {
      setAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const handleFetchFromGithub = async () => {
    if (!githubUrl.trim()) return;
    setFetchingGithub(true);

    let owner = '';
    let repo = '';
    let pullNum = 0;

    const urlMatch = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    const shortMatch = githubUrl.match(/([^/]+)\/([^#]+)#(\d+)/);

    if (urlMatch) {
      owner = urlMatch[1];
      repo = urlMatch[2];
      pullNum = parseInt(urlMatch[3], 10);
    } else if (shortMatch) {
      owner = shortMatch[1];
      repo = shortMatch[2];
      pullNum = parseInt(shortMatch[3], 10);
    } else {
      alert("Invalid format. Use 'owner/repo#123' or 'https://github.com/owner/repo/pull/123'");
      setFetchingGithub(false);
      return;
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNum}`);
      if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
      const prData = await res.json();

      const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNum}/files`);
      const filesData = await filesRes.json();

      const loadedSample: SamplePR = {
        id: `gh-${owner}-${repo}-${pullNum}`,
        title: prData.title || `PR #${pullNum}`,
        description: prData.body || '',
        repoOwner: owner,
        repoName: repo,
        pullNumber: pullNum,
        author: prData.user?.login || 'unknown',
        authorAvatar: prData.user?.avatar_url || 'https://github.com/ghost.png',
        headBranch: prData.head?.ref || 'head',
        baseBranch: prData.base?.ref || 'main',
        commitSha: prData.head?.sha || 'sha',
        files: filesData.map((f: any) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch || '',
          content: f.patch || ''
        }))
      };

      setSelectedSample(loadedSample);
      setActiveMode('sample');
    } catch (err: any) {
      alert("Failed fetching GitHub PR: " + err.message);
    } finally {
      setFetchingGithub(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Sidebar / Stream Selection Panel (4 Cols) */}
      <aside className="lg:col-span-4 bg-[#F3F1ED] border border-[#E5E2D9] p-6 space-y-6">
        <div>
          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#888888] font-mono block mb-1">
            01 // STREAM SELECTION
          </span>
          <h2 className="text-xl font-serif italic text-[#1A1A1A]">Pending Analysis Queue</h2>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#E5E2D9] p-1 text-[9px] font-bold uppercase tracking-[0.1em]">
          <button
            onClick={() => setActiveMode('sample')}
            className={`py-1.5 transition-all ${
              activeMode === 'sample' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F3F1ED] text-[#555] hover:text-[#1A1A1A]'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveMode('custom')}
            className={`py-1.5 transition-all ${
              activeMode === 'custom' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F3F1ED] text-[#555] hover:text-[#1A1A1A]'
            }`}
          >
            Custom
          </button>
          <button
            onClick={() => setActiveMode('github')}
            className={`py-1.5 transition-all ${
              activeMode === 'github' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F3F1ED] text-[#555] hover:text-[#1A1A1A]'
            }`}
          >
            GitHub
          </button>
        </div>

        {/* Preset List */}
        {activeMode === 'sample' && (
          <div className="space-y-3">
            {SAMPLE_PRS.map((sample) => {
              const isSelected = selectedSample.id === sample.id;
              return (
                <div
                  key={sample.id}
                  onClick={() => {
                    setSelectedSample(sample);
                    setCurrentResult(null);
                  }}
                  className={`p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#1A1A1A] shadow-sm'
                      : 'bg-[#F9F8F6] border-[#E5E2D9] hover:border-[#1A1A1A]/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-mono text-indigo-700 font-bold uppercase">
                      #{sample.pullNumber} // {sample.repoOwner}/{sample.repoName}
                    </span>
                    <span className="text-[9px] text-[#666]">@{sample.author}</span>
                  </div>
                  <p className="font-bold text-xs uppercase tracking-tight text-[#1A1A1A] line-clamp-2 leading-snug">
                    {sample.title}
                  </p>
                  <div className="mt-2 text-[9px] font-mono text-[#888] flex justify-between">
                    <span>{sample.files.length} File(s)</span>
                    <span>{sample.headBranch} → {sample.baseBranch}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom Patch Input Mode */}
        {activeMode === 'custom' && (
          <div className="space-y-3 bg-white p-4 border border-[#E5E2D9]">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-[#666] mb-1">
                PR Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs px-3 py-1.5 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-[#666] mb-1">
                File Relative Path
              </label>
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-1.5 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-[#666] mb-1">
                Diff Patch Code
              </label>
              <textarea
                rows={6}
                value={customPatch}
                onChange={(e) => setCustomPatch(e.target.value)}
                className="w-full bg-[#1A1A1A] text-emerald-300 font-mono text-[10px] p-3 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* GitHub Import Mode */}
        {activeMode === 'github' && (
          <div className="bg-white p-4 border border-[#E5E2D9] space-y-3">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-[#666]">
              GitHub PR Reference
            </label>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="e.g. facebook/react#25000"
              className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
            />
            <button
              onClick={handleFetchFromGithub}
              disabled={fetchingGithub || !githubUrl.trim()}
              className="w-full py-2 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-all disabled:opacity-50"
            >
              {fetchingGithub ? 'Fetching GitHub PR...' : 'Load PR Data'}
            </button>
          </div>
        )}

        {/* Execute Action Callout */}
        <div className="pt-4 border-t border-[#E5E2D9]">
          <button
            onClick={handleRunReview}
            disabled={analyzing}
            className="w-full py-3 bg-[#1A1A1A] hover:bg-[#333333] text-white text-[10px] font-bold uppercase tracking-[0.25em] transition-all flex items-center justify-center space-x-2 shadow-md disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing Manuscript...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Execute Review Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Progress State */}
        {analyzing && (
          <div className="p-3 bg-[#1A1A1A] text-white text-[10px] font-mono leading-relaxed border-l-2 border-indigo-500">
            <div className="flex items-center space-x-2 text-indigo-300 font-bold mb-1">
              <Cpu className="w-3.5 h-3.5 animate-spin" />
              <span>AST & LLM ENGINE ACTIVE</span>
            </div>
            <p className="text-gray-300">{analysisStep}</p>
          </div>
        )}
      </aside>

      {/* Main Editorial Workspace (8 Cols) */}
      <section className="lg:col-span-8 space-y-6">
        {/* Selected PR Article Header Box */}
        <div className="bg-white border border-[#E5E2D9] p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-4">
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-0.5 bg-[#1A1A1A] text-white text-[9px] font-bold uppercase tracking-widest font-mono">
                {activeMode === 'sample' ? `#PR-${selectedSample.pullNumber}` : 'CUSTOM PR'}
              </span>
              <span className="text-[10px] font-mono text-[#888]">
                {activeMode === 'sample' ? `${selectedSample.repoOwner}/${selectedSample.repoName}` : 'In-Memory Patch'}
              </span>
            </div>

            <div className="flex items-center space-x-3 text-[10px] uppercase tracking-wider font-mono text-[#666]">
              <span>Author: <strong className="text-[#1A1A1A]">@{activeMode === 'sample' ? selectedSample.author : 'developer'}</strong></span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif italic text-[#1A1A1A] leading-tight tracking-tight">
            {activeMode === 'sample' ? selectedSample.title : customTitle}
          </h1>

          <p className="font-serif text-base text-[#555] italic leading-relaxed">
            {activeMode === 'sample' ? selectedSample.description : 'Custom diff submitted for hybrid static AST rules inspection and Gemini 3.6 Flash LLM reasoning.'}
          </p>

          <div className="pt-4 border-t border-[#E5E2D9] flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-[#666]">
            <div>
              <span>HEAD: <code className="bg-[#F3F1ED] px-1.5 py-0.5 border border-[#E5E2D9] text-[#1A1A1A] font-bold">{activeMode === 'sample' ? selectedSample.headBranch : 'feature'}</code></span>
              <span className="mx-2">→</span>
              <span>BASE: <code className="bg-[#F3F1ED] px-1.5 py-0.5 border border-[#E5E2D9] text-[#1A1A1A]">{activeMode === 'sample' ? selectedSample.baseBranch : 'main'}</code></span>
            </div>

            <div>
              <span>Files to inspect: <strong className="text-[#1A1A1A]">{activeMode === 'sample' ? selectedSample.files.length : 1}</strong></span>
            </div>
          </div>
        </div>

        {/* Results Article Section */}
        {currentResult ? (
          <div className="space-y-6">
            {/* View Selector Switcher */}
            <div className="bg-[#F3F1ED] border border-[#E5E2D9] p-2 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-4 py-2 transition-all ${
                    activeView === 'dashboard'
                      ? 'bg-[#1A1A1A] text-white shadow-sm'
                      : 'text-[#666] hover:text-[#1A1A1A]'
                  }`}
                >
                  Executive Report
                </button>

                <button
                  onClick={() => setActiveView('diff')}
                  className={`px-4 py-2 transition-all flex items-center space-x-2 ${
                    activeView === 'diff'
                      ? 'bg-[#1A1A1A] text-white shadow-sm'
                      : 'text-[#666] hover:text-[#1A1A1A]'
                  }`}
                >
                  <span>Annotated Code Diff</span>
                  <span className="px-1.5 py-0.2 bg-[#F9F8F6] text-[#1A1A1A] font-mono text-[9px]">
                    {currentResult.inlineComments.length}
                  </span>
                </button>
              </div>

              <div className="hidden sm:block text-[9px] font-mono text-[#888]">
                Analysis duration: {currentResult.processingTimeMs}ms
              </div>
            </div>

            {/* Active Sub-View */}
            {activeView === 'dashboard' ? (
              <ReviewDashboard reviewResult={currentResult} />
            ) : (
              <DiffViewer
                files={activeMode === 'sample' ? selectedSample.files : [{ filename: customFilename, patch: customPatch }]}
                inlineComments={currentResult.inlineComments}
              />
            )}
          </div>
        ) : (
          /* Empty state prompt */
          <div className="bg-white border border-[#E5E2D9] p-12 text-center space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#888]">
              Ready for Analysis
            </span>
            <h3 className="text-2xl font-serif italic text-[#1A1A1A]">
              Click "Execute Review Analysis" to trigger Gemini LLM + AST static rules.
            </h3>
            <p className="text-xs text-[#666] max-w-md mx-auto leading-relaxed">
              The engine will perform zero-day vulnerability checks, memory leak detection, N+1 query scans, and generate inline code annotations.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
