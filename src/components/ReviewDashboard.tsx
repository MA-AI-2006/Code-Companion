import React, { useState } from 'react';
import { ReviewResult } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, MessageSquare, Shield, Zap, Award, ExternalLink, Send, Check } from 'lucide-react';

interface ReviewDashboardProps {
  reviewResult: ReviewResult;
}

export const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ reviewResult }) => {
  const [postingToGithub, setPostingToGithub] = useState<boolean>(false);
  const [postStatus, setPostStatus] = useState<{ success?: boolean; url?: string; error?: string } | null>(null);

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'APPROVE':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-700" />,
          label: 'Approved'
        };
      case 'REQUEST_CHANGES':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: <XCircle className="w-4 h-4 text-rose-700" />,
          label: 'Changes Requested'
        };
      default:
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <MessageSquare className="w-4 h-4 text-amber-700" />,
          label: 'Commented'
        };
    }
  };

  const verdictStyle = getVerdictStyle(reviewResult.verdict);

  const handlePostToGithub = async () => {
    setPostingToGithub(true);
    setPostStatus(null);
    try {
      const res = await fetch('/api/review/post-to-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewResult })
      });
      const data = await res.json();
      setPostStatus(data);
    } catch (err: any) {
      setPostStatus({ success: false, error: err.message || 'Failed posting to GitHub' });
    } finally {
      setPostingToGithub(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Overview Card */}
      <div className="bg-white border border-[#E5E2D9] p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-[#E5E2D9] pb-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border flex items-center space-x-1.5 ${verdictStyle.bg}`}>
                {verdictStyle.icon}
                <span>{verdictStyle.label}</span>
              </span>
              <span className="text-[10px] font-mono text-[#666]">
                PR #{reviewResult.prNumber} // {reviewResult.repoOwner}/{reviewResult.repoName}
              </span>
            </div>

            <h2 className="text-2xl font-serif italic text-[#1A1A1A] tracking-tight">{reviewResult.prTitle}</h2>

            <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-[#666]">
              <span>Author: <strong className="text-[#1A1A1A]">@{reviewResult.author}</strong></span>
              <span>Branch: <code className="bg-[#F3F1ED] px-1.5 py-0.5 border border-[#E5E2D9] text-[#1A1A1A] font-bold">{reviewResult.headBranch}</code> → <code className="bg-[#F3F1ED] px-1.5 py-0.5 border border-[#E5E2D9] text-[#1A1A1A]">{reviewResult.baseBranch}</code></span>
              <span>Sha: <code>{reviewResult.commitSha.substring(0, 7)}</code></span>
            </div>
          </div>

          {/* Quality Score Display */}
          <div className="flex items-center space-x-6 self-stretch lg:self-auto justify-between lg:justify-end">
            <div className="text-center bg-[#F9F8F6] p-4 border border-[#E5E2D9] min-w-32">
              <div className="text-4xl font-serif italic font-bold text-[#1A1A1A] flex items-baseline justify-center">
                <span className={reviewResult.score >= 80 ? 'text-emerald-700' : reviewResult.score >= 60 ? 'text-amber-700' : 'text-rose-700'}>
                  {reviewResult.score}
                </span>
                <span className="text-xs text-[#888] font-mono font-normal">/100</span>
              </div>
              <p className="text-[9px] font-bold text-[#666] uppercase tracking-[0.2em] mt-1 font-mono">Quality Score</p>
            </div>

            <button
              onClick={handlePostToGithub}
              disabled={postingToGithub}
              className="px-5 py-3 bg-[#1A1A1A] hover:bg-[#333333] disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center space-x-2 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{postingToGithub ? 'Posting...' : 'Post Inline Review to GitHub'}</span>
            </button>
          </div>
        </div>

        {/* Post Result Status Banner */}
        {postStatus && (
          <div className={`p-4 border text-xs flex items-center justify-between ${
            postStatus.success ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}>
            <div className="flex items-center space-x-2 font-medium">
              {postStatus.success ? <Check className="w-4 h-4 text-emerald-700" /> : <AlertTriangle className="w-4 h-4 text-rose-700" />}
              <span>{postStatus.success ? 'Review comments successfully posted to GitHub repository!' : `GitHub API Error: ${postStatus.error}`}</span>
            </div>
            {postStatus.url && (
              <a
                href={postStatus.url}
                target="_blank"
                rel="noreferrer"
                className="font-bold underline flex items-center space-x-1 text-xs uppercase tracking-wider"
              >
                <span>View on GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Executive Summary Quote Callout */}
        <div>
          <h4 className="text-[9px] font-bold text-[#888] uppercase tracking-[0.3em] font-mono mb-2">Executive Summary</h4>
          <div className="bg-[#F9F8F6] p-6 border-l-2 border-[#1A1A1A] text-base font-serif italic text-[#333] leading-relaxed">
            "{reviewResult.summary}"
          </div>
        </div>
      </div>

      {/* Category Breakdown & Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Scores */}
        <div className="bg-white border border-[#E5E2D9] p-6 shadow-sm space-y-4">
          <h3 className="font-serif italic text-lg text-[#1A1A1A] flex items-center space-x-2 border-b border-[#E5E2D9] pb-3">
            <Zap className="w-4 h-4 text-indigo-600" />
            <span>Category Performance Ratings</span>
          </h3>

          <div className="space-y-4">
            {reviewResult.categoriesBreakdown.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1A1A1A] uppercase tracking-wide text-[11px]">{cat.category}</span>
                  <div className="flex items-center space-x-2 font-mono text-[10px]">
                    <span className="text-[#666]">{cat.details}</span>
                    <span className="font-bold text-[#1A1A1A]">{cat.score}/100</span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-[#F3F1ED] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      cat.score >= 80 ? 'bg-emerald-600' : cat.score >= 60 ? 'bg-amber-600' : 'bg-rose-600'
                    }`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Positive Highlights */}
        <div className="bg-white border border-[#E5E2D9] p-6 shadow-sm space-y-4">
          <h3 className="font-serif italic text-lg text-[#1A1A1A] flex items-center space-x-2 border-b border-[#E5E2D9] pb-3">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Positive Code Highlights</span>
          </h3>

          <div className="space-y-2.5">
            {reviewResult.positiveHighlights.map((highlight, idx) => (
              <div key={idx} className="p-3 bg-[#F9F8F6] border border-[#E5E2D9] text-xs text-[#333] flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{highlight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Static Issues Summary Table */}
      {reviewResult.staticIssues.length > 0 && (
        <div className="bg-white border border-[#E5E2D9] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
            <h3 className="font-serif italic text-lg text-[#1A1A1A] flex items-center space-x-2">
              <Shield className="w-4 h-4 text-rose-600" />
              <span>Static AST Linter Findings ({reviewResult.staticIssues.length})</span>
            </h3>
          </div>

          <div className="overflow-x-auto border border-[#E5E2D9]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F3F1ED] text-[#666] border-b border-[#E5E2D9] font-mono text-[10px] uppercase tracking-wider">
                  <th className="p-3">Rule ID</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Issue Title</th>
                  <th className="p-3">Suggested Fix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D9] text-[#333]">
                {reviewResult.staticIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-[#F9F8F6]">
                    <td className="p-3 font-mono text-indigo-700 font-bold">{issue.ruleId}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono ${
                        issue.severity === 'critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[#555]">{issue.file}:{issue.line}</td>
                    <td className="p-3 font-bold text-[#1A1A1A]">{issue.title}</td>
                    <td className="p-3 text-[#666] font-mono text-[11px]">{issue.fixSuggestion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
