import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const RuleManager: React.FC = () => {
  const rules = [
    {
      id: 'SEC-001',
      name: 'Hardcoded API Key & Credentials',
      category: 'SECURITY',
      severity: 'CRITICAL',
      description: 'Detects hardcoded secrets, RSA private keys, AWS tokens, and Stripe secret keys in commit diffs.',
      owasp: 'A07:2021-Identification and Authentication Failures'
    },
    {
      id: 'SEC-002',
      name: 'SQL Injection Vulnerability',
      category: 'SECURITY',
      severity: 'CRITICAL',
      description: 'Identifies raw string concatenation and unparameterized SQL query execution.',
      owasp: 'A03:2021-Injection'
    },
    {
      id: 'SEC-003',
      name: 'Arbitrary Code Execution (eval)',
      category: 'SECURITY',
      severity: 'CRITICAL',
      description: 'Flags usage of eval(), new Function(), or dynamic code execution on un-sanitized user strings.',
      owasp: 'A03:2021-Injection'
    },
    {
      id: 'SEC-004',
      name: 'Cross-Site Scripting (XSS / dangerouslySetInnerHTML)',
      category: 'SECURITY',
      severity: 'CRITICAL',
      description: 'Scans for raw innerHTML assignments or un-sanitized dangerouslySetInnerHTML renders.',
      owasp: 'A03:2021-Injection'
    },
    {
      id: 'SEC-005',
      name: 'Insecure Crypto / Math.random()',
      category: 'SECURITY',
      severity: 'WARNING',
      description: 'Warns when Math.random() is used for token generation or security-sensitive cryptography.',
      owasp: 'A02:2021-Cryptographic Failures'
    },
    {
      id: 'BUG-001',
      name: 'Missing Event Listener / Timer Cleanup',
      category: 'CODE_SMELL',
      severity: 'WARNING',
      description: 'Detects memory leaks in React useEffect hooks missing return cleanup functions for intervals or event listeners.',
      owasp: 'N/A - Memory Leak'
    },
    {
      id: 'BUG-002',
      name: 'Swallowed Exception (Empty Catch Block)',
      category: 'CODE_SMELL',
      severity: 'WARNING',
      description: 'Detects silent exception suppression where catch (err) {} contains no logging or rethrow.',
      owasp: 'A09:2021-Security Logging and Monitoring Failures'
    },
    {
      id: 'PERF-001',
      name: 'N+1 Database Query in Async Loop',
      category: 'PERFORMANCE',
      severity: 'CRITICAL',
      description: 'Flags database queries or network fetch calls executed sequentially inside for/while loops.',
      owasp: 'N/A - Scalability'
    },
    {
      id: 'TYP-001',
      name: 'Explicit Any Type Violation',
      category: 'TYPE_SAFETY',
      severity: 'INFO',
      description: 'Scans for explicit any annotations that undermine TypeScript compile-time guarantees.',
      owasp: 'N/A - Type Safety'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E5E2D9] p-8 shadow-sm space-y-2">
        <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#888] font-mono block">
          02 // STATIC RULE SETS
        </span>
        <h2 className="text-2xl font-serif italic text-[#1A1A1A]">Hybrid AST & Static Linter Rules</h2>
        <p className="text-xs text-[#555] font-serif italic">
          Active static inspection rules checking code patches prior to Gemini LLM reasoning.
        </p>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white border border-[#E5E2D9] p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
              <span className="font-mono text-[10px] font-bold text-[#1A1A1A] bg-[#F3F1ED] px-2 py-0.5 border border-[#E5E2D9]">
                {rule.id}
              </span>
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono ${
                rule.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' : rule.severity === 'WARNING' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-[#F3F1ED] text-[#666] border border-[#E5E2D9]'
              }`}>
                {rule.severity}
              </span>
            </div>

            <h4 className="font-bold text-sm text-[#1A1A1A] font-sans">{rule.name}</h4>
            <p className="text-xs text-[#444] leading-relaxed font-sans">{rule.description}</p>

            <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-between text-[10px] font-mono text-[#666]">
              <span>Category: <strong className="text-[#1A1A1A] uppercase">{rule.category}</strong></span>
              <span className="text-indigo-800 font-bold">{rule.owasp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
