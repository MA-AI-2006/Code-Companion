import React, { useState } from 'react';
import { Share2, Copy, Check, X, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  shareUrl: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ shareUrl, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#E5E2D9] max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Share2 className="w-5 h-5" />
            </span>
            <h3 className="font-serif italic font-bold text-xl text-[#1A1A1A]">Share Code Link</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#888] hover:text-[#1A1A1A] hover:bg-[#F3F1ED] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#555] font-serif italic leading-relaxed">
          Anyone with this link can view the code, AI review, error explanations, corrected code, and expected output.
        </p>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider font-mono text-[#666]">
            Shareable URL
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-[#F9F8F6] border border-[#E5E2D9] text-xs font-mono px-3 py-2.5 text-[#1A1A1A] focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-wider font-mono transition-colors flex items-center space-x-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E5E2D9] flex justify-between items-center text-xs">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-700 hover:underline flex items-center space-x-1 font-mono text-[11px] font-bold"
          >
            <span>Open Link in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider font-mono"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
