import React, { useState, useEffect } from 'react';
import { WebhookEventLog } from '../types';
import { Activity, ShieldCheck, ShieldAlert, RefreshCw, Trash2, Eye, X, FileText } from 'lucide-react';

interface WebhookLogsViewerProps {
  logs: WebhookEventLog[];
  onRefresh: () => void;
  onClear: () => void;
}

export const WebhookLogsViewer: React.FC<WebhookLogsViewerProps> = ({
  logs,
  onRefresh,
  onClear
}) => {
  const [selectedLog, setSelectedLog] = useState<WebhookEventLog | null>(null);

  useEffect(() => {
    onRefresh();
  }, []);

  return (
    <div className="space-y-6">
      {/* Editorial Header Bar */}
      <div className="bg-white border border-[#E5E2D9] p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#888] font-mono block mb-1">
            03 // REAL-TIME INGEST
          </span>
          <h2 className="text-2xl font-serif italic text-[#1A1A1A]">GitHub Webhook Event Inspector</h2>
          <p className="text-xs text-[#555] mt-1 font-serif italic">
            Real-time stream of incoming GitHub webhooks, HMAC signature checks, and automated review logs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-[#F3F1ED] hover:bg-[#E5E2D9] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider font-mono border border-[#E5E2D9] transition-all flex items-center space-x-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stream</span>
          </button>

          <button
            onClick={onClear}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider font-mono border border-rose-200 transition-all flex items-center space-x-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Logs Table Container */}
      <div className="bg-white border border-[#E5E2D9] shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-16 text-center text-[#666] space-y-3">
            <Activity className="w-8 h-8 text-[#AAA] mx-auto" />
            <h4 className="text-lg font-serif italic text-[#1A1A1A]">No webhook events logged yet</h4>
            <p className="text-xs text-[#666] max-w-md mx-auto leading-relaxed">
              Send a test ping event from the "Connect GitHub Webhook" setup modal, or trigger a PR on your GitHub repo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F3F1ED] text-[#666] border-b border-[#E5E2D9] font-mono text-[10px] uppercase tracking-wider">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Event / Action</th>
                  <th className="p-3">Repository</th>
                  <th className="p-3">Sender</th>
                  <th className="p-3">Signature Verification</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D9] text-[#333]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F9F8F6] transition-colors">
                    <td className="p-3 font-mono text-[#666]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#1A1A1A] font-mono">{log.event}</span>
                      {log.action && <span className="ml-1 text-[#888]">({log.action})</span>}
                    </td>
                    <td className="p-3 font-mono text-indigo-800 font-bold">
                      {log.repoOwner}/{log.repoName} {log.pullNumber ? `#${log.pullNumber}` : ''}
                    </td>
                    <td className="p-3 text-[#333]">@{log.sender}</td>
                    <td className="p-3">
                      {log.signatureValid ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
                          <ShieldCheck className="w-3 h-3" /> HMAC Verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 w-fit">
                          <ShieldAlert className="w-3 h-3" /> Invalid Signature
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[#666]">{log.processingTimeMs}ms</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono ${
                        log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : log.status === 'IGNORED' ? 'bg-[#F3F1ED] text-[#666] border border-[#E5E2D9]' : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#333] text-white text-[9px] font-bold uppercase tracking-widest font-mono transition-colors inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Payload</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E2D9] max-w-3xl w-full shadow-2xl text-[#1A1A1A] overflow-hidden">
            <div className="px-6 py-4 bg-[#F3F1ED] border-b border-[#E5E2D9] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-[#1A1A1A]" />
                <div>
                  <h3 className="font-serif italic font-bold text-lg text-[#1A1A1A]">Webhook Event Manuscript Log</h3>
                  <p className="text-[10px] font-mono text-[#666]">ID: {selectedLog.id} • {new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-[#666] hover:text-[#1A1A1A] bg-white border border-[#E5E2D9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Review Result if available */}
              {selectedLog.reviewResult && (
                <div className="p-4 bg-[#F9F8F6] border border-[#E5E2D9] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono text-indigo-800 uppercase tracking-wider">AI Code Review Result</span>
                    <span className="font-bold text-[#1A1A1A] font-serif">Score: {selectedLog.reviewResult.score}/100</span>
                  </div>
                  <p className="text-xs font-serif italic text-[#333] leading-relaxed">{selectedLog.reviewResult.summary}</p>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold text-[#666] uppercase tracking-[0.2em] font-mono mb-2">Raw Payload JSON</label>
                <pre className="p-4 bg-[#1A1A1A] border border-[#E5E2D9] text-xs font-mono text-emerald-300 overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(selectedLog.rawPayload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F3F1ED] border-t border-[#E5E2D9] flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
