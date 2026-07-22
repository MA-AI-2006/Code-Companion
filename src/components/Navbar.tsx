import React, { useState, useEffect } from 'react';
import { GitPullRequest, ShieldAlert, Activity, Settings, Copy, Check, Webhook, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: 'workbench' | 'logs' | 'rules' | 'settings';
  setActiveTab: (tab: 'workbench' | 'logs' | 'rules' | 'settings') => void;
  onOpenSetupModal: () => void;
  logsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSetupModal,
  logsCount
}) => {
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/webhooks/info')
      .then(res => res.json())
      .then(data => {
        if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
      })
      .catch(() => {});
  }, []);

  const copyWebhookUrl = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-20 bg-[#F9F8F6] border-b border-[#E5E2D9] text-[#1A1A1A] sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        {/* Brand & Masthead Title */}
        <div className="flex items-baseline gap-3 cursor-pointer" onClick={() => setActiveTab('workbench')}>
          <span className="text-[10px] tracking-[0.3em] font-bold uppercase opacity-40 font-mono">V.02</span>
          <h1 className="text-2xl font-serif italic tracking-tight font-light text-[#1A1A1A]">
            Syntax<span className="not-italic text-indigo-600 font-sans font-bold">.</span>Archive
          </h1>
          <span className="hidden lg:inline-block text-[9px] uppercase tracking-[0.2em] font-mono text-[#666666] bg-[#F3F1ED] px-2 py-0.5 border border-[#E5E2D9]">
            AI & AST Reviewer
          </span>
        </div>

        {/* Editorial Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-[11px] uppercase tracking-[0.2em] font-bold">
          <button
            onClick={() => setActiveTab('workbench')}
            className={`py-2 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'workbench'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#888888] hover:text-[#1A1A1A]'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>01. PR Workbench</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 border-b-2 transition-all flex items-center space-x-1.5 relative ${
              activeTab === 'logs'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#888888] hover:text-[#1A1A1A]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>02. Webhook Logs</span>
            {logsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] bg-[#1A1A1A] text-white rounded font-mono">
                {logsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'rules'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#888888] hover:text-[#1A1A1A]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>03. AST Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'settings'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#888888] hover:text-[#1A1A1A]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>04. Config</span>
          </button>
        </nav>

        {/* Live System Badges & Webhook Trigger */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-mono text-[#555]">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>Webhook: Active</span>
          </div>

          <button
            onClick={onOpenSetupModal}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-sm"
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Connect Webhook</span>
          </button>

          {webhookUrl && (
            <button
              onClick={copyWebhookUrl}
              title="Copy Webhook Endpoint URL"
              className="p-2 text-[#555555] hover:text-[#1A1A1A] bg-[#F3F1ED] hover:bg-[#EAE7DF] border border-[#E5E2D9] transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
