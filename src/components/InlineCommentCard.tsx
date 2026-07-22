import React, { useState } from 'react';
import { InlineReviewComment } from '../types';
import { ShieldAlert, AlertTriangle, Lightbulb, MessageSquare, Copy, Check, Code2 } from 'lucide-react';

interface InlineCommentCardProps {
  comment: InlineReviewComment;
}

export const InlineCommentCard: React.FC<InlineCommentCardProps> = ({ comment }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          border: 'border-l-4 border-l-rose-700 border-[#E5E2D9]',
          icon: <ShieldAlert className="w-4 h-4 text-rose-700" />
        };
      case 'WARNING':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          border: 'border-l-4 border-l-amber-700 border-[#E5E2D9]',
          icon: <AlertTriangle className="w-4 h-4 text-amber-700" />
        };
      case 'SUGGESTION':
        return {
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          border: 'border-l-4 border-l-indigo-700 border-[#E5E2D9]',
          icon: <Lightbulb className="w-4 h-4 text-indigo-700" />
        };
      default:
        return {
          badge: 'bg-[#F3F1ED] text-[#555] border-[#E5E2D9]',
          border: 'border-l-4 border-l-[#888] border-[#E5E2D9]',
          icon: <MessageSquare className="w-4 h-4 text-[#666]" />
        };
    }
  };

  const style = getSeverityStyle(comment.severity);

  const handleCopyCode = () => {
    if (!comment.suggestedCode) return;
    navigator.clipboard.writeText(comment.suggestedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-3 p-5 bg-white border shadow-sm text-[#1A1A1A] text-xs font-sans ${style.border}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3 mb-3">
        <div className="flex items-center space-x-2">
          {style.icon}
          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono border ${style.badge}`}>
            {comment.severity}
          </span>
          <span className="px-2 py-0.5 text-[9px] bg-[#F3F1ED] text-[#1A1A1A] border border-[#E5E2D9] font-mono uppercase font-bold">
            {comment.category}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#888]">
          {comment.path}:{comment.line}
        </span>
      </div>

      {/* Comment Title & Markdown Body */}
      <h5 className="font-bold text-sm text-[#1A1A1A] mb-1 font-sans">{comment.title}</h5>
      <p className="text-[#444] leading-relaxed whitespace-pre-wrap font-sans text-xs">{comment.comment}</p>

      {/* Suggested Code Snippet */}
      {comment.suggestedCode && (
        <div className="mt-4 bg-[#1A1A1A] border border-[#E5E2D9] overflow-hidden">
          <div className="px-3 py-2 bg-[#262626] border-b border-[#333] flex items-center justify-between text-[10px]">
            <span className="text-emerald-400 font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" /> Suggested Code Refactor
            </span>
            <button
              onClick={handleCopyCode}
              className="text-[#AAA] hover:text-white font-mono flex items-center space-x-1 px-2 py-0.5 hover:bg-[#333] transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
          <pre className="p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {comment.suggestedCode}
          </pre>
        </div>
      )}
    </div>
  );
};
