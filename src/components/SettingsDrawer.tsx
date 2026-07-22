import React, { useState, useEffect } from 'react';
import { ReviewerSettings } from '../types';
import { Save, Key, Sliders, Check } from 'lucide-react';

export const SettingsDrawer: React.FC = () => {
  const [settings, setSettings] = useState<ReviewerSettings>({
    githubToken: '',
    webhookSecret: '',
    enableAutoPost: true,
    strictness: 'standard',
    minSeverityToComment: 'WARNING',
    enabledRules: {
      security: true,
      performance: true,
      codeSmells: true,
      typeSafety: true,
      memoryLeaks: true,
      owaspTop10: true
    },
    customPromptInstructions: 'Focus on OWASP top 10 vulnerabilities, memory leaks, performance bottlenecks, and clean code.',
    autoApproveScoreThreshold: 85
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(prev => ({ ...prev, ...data }));
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E5E2D9] p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#888] font-mono block mb-1">
            04 // SYSTEM PREFERENCES
          </span>
          <h2 className="text-2xl font-serif italic text-[#1A1A1A]">Code Reviewer Configuration</h2>
          <p className="text-xs text-[#555] font-serif italic mt-1">
            Configure GitHub API integration, Webhook HMAC secret, review strictness, and Gemini prompt directives.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#333] disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center space-x-2 shadow-sm font-mono"
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Settings Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GitHub Secrets & Tokens */}
        <div className="bg-white border border-[#E5E2D9] p-6 shadow-sm space-y-4">
          <h3 className="font-serif italic text-lg text-[#1A1A1A] flex items-center space-x-2 border-b border-[#E5E2D9] pb-3">
            <Key className="w-4 h-4 text-[#1A1A1A]" />
            <span>GitHub Credentials & Secret Key</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-[#666] uppercase tracking-wider font-mono mb-1">
                GitHub Personal Access Token (PAT)
              </label>
              <input
                type="password"
                value={settings.githubToken}
                onChange={(e) => setSettings({ ...settings, githubToken: e.target.value })}
                placeholder="ghp_************************************"
                className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs px-3 py-2 text-[#1A1A1A] font-mono focus:outline-none focus:border-[#1A1A1A]"
              />
              <p className="text-[10px] text-[#888] mt-1 font-mono">
                Required for posting automated review comments directly back to GitHub repositories (`repo` scope).
              </p>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#666] uppercase tracking-wider font-mono mb-1">
                GitHub Webhook Secret Phrase
              </label>
              <input
                type="password"
                value={settings.webhookSecret}
                onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                placeholder="HMAC Secret Key string"
                className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs px-3 py-2 text-[#1A1A1A] font-mono focus:outline-none focus:border-[#1A1A1A]"
              />
              <p className="text-[10px] text-[#888] mt-1 font-mono">
                Used to verify incoming `X-Hub-Signature-256` HMAC headers on `/api/webhooks/github`.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A]">Automatically Post Reviews to GitHub</span>
                <p className="text-[10px] text-[#666]">Post inline comments automatically when webhooks trigger</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableAutoPost}
                onChange={(e) => setSettings({ ...settings, enableAutoPost: e.target.checked })}
                className="w-4 h-4 accent-[#1A1A1A] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Reviewer Strictness & Directives */}
        <div className="bg-white border border-[#E5E2D9] p-6 shadow-sm space-y-4">
          <h3 className="font-serif italic text-lg text-[#1A1A1A] flex items-center space-x-2 border-b border-[#E5E2D9] pb-3">
            <Sliders className="w-4 h-4 text-[#1A1A1A]" />
            <span>Review Strictness & Gemini Prompt</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-[#666] uppercase tracking-wider font-mono mb-1">Review Strictness Level</label>
              <select
                value={settings.strictness}
                onChange={(e) => setSettings({ ...settings, strictness: e.target.value as any })}
                className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs px-3 py-2 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="lax">Lax - Only flag severe security exploits</option>
                <option value="standard">Standard - Balanced security, bugs & performance</option>
                <option value="strict">Strict - Comprehensive code quality & refactoring</option>
                <option value="paranoid">Paranoid - Maximum security audit, style & zero warnings</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#666] uppercase tracking-wider font-mono mb-1">Custom Gemini LLM Instructions</label>
              <textarea
                rows={4}
                value={settings.customPromptInstructions}
                onChange={(e) => setSettings({ ...settings, customPromptInstructions: e.target.value })}
                className="w-full bg-[#F9F8F6] border border-[#E5E2D9] text-xs px-3 py-2 text-[#1A1A1A] font-serif italic focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
