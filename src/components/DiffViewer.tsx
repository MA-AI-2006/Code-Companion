import React, { useState } from 'react';
import { InlineReviewComment } from '../types';
import { InlineCommentCard } from './InlineCommentCard';
import { Filter, FileText, ChevronDown, ChevronRight } from 'lucide-react';

interface DiffViewerProps {
  files: { filename: string; patch?: string; content?: string }[];
  inlineComments: InlineReviewComment[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ files, inlineComments }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  const toggleFileCollapse = (filename: string) => {
    setCollapsedFiles(prev => ({ ...prev, [filename]: !prev[filename] }));
  };

  const filteredComments = inlineComments.filter(c => {
    if (selectedSeverity === 'ALL') return true;
    return c.severity === selectedSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="bg-[#F3F1ED] border border-[#E5E2D9] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-[10px] text-[#1A1A1A] font-bold uppercase tracking-wider font-mono">
          <Filter className="w-3.5 h-3.5 text-[#1A1A1A]" />
          <span>Filter Annotations:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'CRITICAL', 'WARNING', 'SUGGESTION', 'NITPICK'].map((sev) => {
            const count = sev === 'ALL'
              ? inlineComments.length
              : inlineComments.filter(c => c.severity === sev).length;

            return (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider font-mono transition-all ${
                  selectedSeverity === sev
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'bg-white text-[#555] hover:text-[#1A1A1A] border border-[#E5E2D9]'
                }`}
              >
                {sev} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Files List */}
      {files.map((file) => {
        const fileComments = filteredComments.filter(c => c.path === file.filename || files.length === 1);
        const isCollapsed = collapsedFiles[file.filename];

        const lines = (file.content || file.patch || '').split('\n');

        return (
          <div key={file.filename} className="bg-white border border-[#E5E2D9] overflow-hidden shadow-sm">
            {/* File Header */}
            <div
              onClick={() => toggleFileCollapse(file.filename)}
              className="px-5 py-3 bg-[#F9F8F6] border-b border-[#E5E2D9] flex items-center justify-between cursor-pointer hover:bg-[#F3F1ED] transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                {isCollapsed ? <ChevronRight className="w-4 h-4 text-[#666]" /> : <ChevronDown className="w-4 h-4 text-[#666]" />}
                <FileText className="w-4 h-4 text-[#1A1A1A]" />
                <span className="font-mono text-xs font-bold text-[#1A1A1A]">{file.filename}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold bg-[#1A1A1A] text-white">
                  {fileComments.length} Comment(s)
                </span>
              </div>
            </div>

            {/* Code & Inline Comments Body */}
            {!isCollapsed && (
              <div className="font-mono text-xs overflow-x-auto bg-[#F9F8F6] divide-y divide-[#E5E2D9]">
                {lines.map((lineText, idx) => {
                  const lineNum = idx + 1;
                  const commentsForLine = fileComments.filter(c => c.line === lineNum);

                  let lineBg = 'bg-white text-[#333]';
                  if (lineText.startsWith('+')) {
                    lineBg = 'bg-emerald-50/80 text-emerald-950 font-medium';
                  } else if (lineText.startsWith('-')) {
                    lineBg = 'bg-rose-50/80 text-rose-950 font-medium';
                  }

                  return (
                    <React.Fragment key={idx}>
                      {/* Code Line */}
                      <div className={`flex items-stretch hover:bg-[#F3F1ED] transition-colors ${lineBg}`}>
                        <div className="w-12 select-none text-right pr-3 py-1 bg-[#F3F1ED] text-[#888] border-r border-[#E5E2D9] font-mono text-[10px]">
                          {lineNum}
                        </div>
                        <div className="p-1 px-4 whitespace-pre overflow-x-auto flex-1 font-mono text-[11px] leading-relaxed">
                          {lineText}
                        </div>
                      </div>

                      {/* Render Inline Review Comments under matching line */}
                      {commentsForLine.length > 0 && (
                        <div className="bg-[#F3F1ED] px-6 py-3 border-y border-[#E5E2D9]">
                          {commentsForLine.map((comment) => (
                            <InlineCommentCard key={comment.id} comment={comment} />
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
