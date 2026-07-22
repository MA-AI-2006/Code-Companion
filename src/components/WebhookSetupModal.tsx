import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Webhook, ShieldCheck, Play, ArrowRight, ExternalLink } from 'lucide-react';

interface WebhookSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshLogs?: () => void;
}

export const WebhookSetupModal: React.FC<WebhookSetupModalProps> = ({
  isOpen,
  onClose,
  onRefreshLogs
}) => {
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [hasSecret, setHasSecret] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [pinging, setPinging] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/webhooks/info')
        .then(res => res.json())
        .then(data => {
          setWebhookUrl(data.webhookUrl || window.location.origin + '/api/webhooks/github');
          setHasSecret(data.hasSecret);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendPing = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'ping'
        },
        body: JSON.stringify({
          zen: 'Anything added can be executed cleanly.',
          hook_id: 1024,
          repository: {
            name: 'demo-repository',
            owner: { login: 'github-user' }
          },
          sender: { login: 'github-user' }
        })
      });

      const data = await res.json();
      setPingResult({ status: res.status, data });
      if (onRefreshLogs) onRefreshLogs();
    } catch (err: any) {
      setPingResult({ status: 'ERROR', error: err.message });
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">GitHub Webhook Integration</h3>
              <p className="text-xs text-slate-400">Connect any GitHub repository for automated AI PR reviews</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Step 1: Endpoint URL */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              Payload URL (Webhook Receiver)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all flex items-center space-x-2 shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Settings Checklist */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              GitHub Repository Webhook Settings
            </label>
            
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Content type</span>
                <span className="font-mono bg-slate-900 px-2 py-1 rounded text-indigo-300 font-semibold">application/json</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Secret</span>
                <span className="font-mono bg-slate-900 px-2 py-1 rounded text-slate-300">
                  {hasSecret ? 'HMAC SHA256 Configured' : 'Optional (Configurable in Settings)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Which events to trigger?</span>
                <span className="text-emerald-400 font-medium">Select "Pull requests" & "Pushes"</span>
              </div>
            </div>
          </div>

          {/* Step 3: Interactive Webhook Test */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                Test Webhook Connection
              </label>
              <button
                onClick={handleSendPing}
                disabled={pinging}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-all flex items-center space-x-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{pinging ? 'Sending Ping...' : 'Send Test Ping Event'}</span>
              </button>
            </div>

            {pingResult && (
              <div className={`p-3 rounded-xl border text-xs font-mono ${
                pingResult.status === 200 ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-rose-950/30 border-rose-800 text-rose-300'
              }`}>
                <div className="font-semibold mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Response Status: {pingResult.status}
                </div>
                <pre className="mt-1 whitespace-pre-wrap overflow-x-auto text-[11px] bg-slate-950 p-2 rounded border border-slate-800">
                  {JSON.stringify(pingResult.data || pingResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <a
            href="https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>GitHub Webhooks Guide</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
