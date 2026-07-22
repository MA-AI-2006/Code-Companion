import { StaticIssue, IssueCategory } from '../types';

interface Rule {
  id: string;
  name: string;
  category: IssueCategory;
  severity: 'critical' | 'warning' | 'info';
  languages: string[];
  pattern: RegExp;
  title: string;
  message: (match: RegExpExecArray) => string;
  fixSuggestion: (match: RegExpExecArray) => string;
}

const STATIC_RULES: Rule[] = [
  // --- SECURITY RULES ---
  {
    id: 'SEC-001',
    name: 'Hardcoded Secret / API Key',
    category: 'SECURITY',
    severity: 'critical',
    languages: ['ts', 'js', 'py', 'go', 'json', 'yaml', 'env'],
    pattern: /(?:api_key|secret_key|private_key|token|auth_token|passwd|password)\s*[:=]\s*["'](sk-[a-zA-Z0-9]{20,}|AIzaSy[a-zA-Z0-9_-]{33}|ghp_[a-zA-Z0-9]{36}|[a-zA-Z0-9]{32,})["']/i,
    title: 'Potential Hardcoded API Key or Secret',
    message: () => 'Detected hardcoded credentials in source code. Credentials should never be committed to repository.',
    fixSuggestion: () => 'Extract the secret into process.env / environment variables or a secure key manager.'
  },
  {
    id: 'SEC-002',
    name: 'SQL Injection Vulnerability',
    category: 'SECURITY',
    severity: 'critical',
    languages: ['ts', 'js', 'py', 'go', 'sql'],
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+.*(?:\+\s*\w+|\$\{\w+\}|\%\s*\w+|\.format\()/i,
    title: 'Potential SQL Injection Risk',
    message: () => 'Dynamic string interpolation detected inside SQL query string. This creates an OWASP Top 10 SQL Injection risk.',
    fixSuggestion: () => 'Use parameterized queries (e.g. `db.query("SELECT * FROM users WHERE id = $1", [userId])`) or an ORM like Drizzle/Prisma.'
  },
  {
    id: 'SEC-003',
    name: 'Unsafe Dynamic Code Execution (eval / new Function)',
    category: 'SECURITY',
    severity: 'critical',
    languages: ['ts', 'js'],
    pattern: /\b(?:eval\(|new\s+Function\(|setTimeout\s*\(\s*["'])/,
    title: 'Arbitrary Code Execution Risk',
    message: () => 'Usage of `eval()` or dynamic Function construction allows execution of arbitrary untrusted input.',
    fixSuggestion: () => 'Avoid eval(). Use safe JSON parsing (`JSON.parse`) or explicit object lookup tables.'
  },
  {
    id: 'SEC-004',
    name: 'XSS Risk (dangerouslySetInnerHTML / innerHTML)',
    category: 'SECURITY',
    severity: 'critical',
    languages: ['ts', 'js', 'jsx', 'tsx', 'html'],
    pattern: /\b(?:dangerouslySetInnerHTML|innerHTML\s*=)/,
    title: 'Potential Cross-Site Scripting (XSS) Vulnerability',
    message: () => 'Directly setting raw HTML bypassing framework sanitization can expose users to XSS attacks.',
    fixSuggestion: () => 'Sanitize input using DOMPurify before rendering or use standard React text interpolation `{text}`.'
  },
  {
    id: 'SEC-005',
    name: 'Insecure Cryptographic Randomness',
    category: 'SECURITY',
    severity: 'warning',
    languages: ['ts', 'js'],
    pattern: /\bMath\.random\s*\(\s*\)/,
    title: 'Insecure Pseudo-Random Generator',
    message: () => '`Math.random()` is not cryptographically secure and must not be used for token generation, authorization, or cryptography.',
    fixSuggestion: () => 'Use `crypto.getRandomValues()` in browser or `crypto.randomBytes()` in Node.js.'
  },
  {
    id: 'SEC-006',
    name: 'Path Traversal Risk',
    category: 'SECURITY',
    severity: 'critical',
    languages: ['ts', 'js', 'py'],
    pattern: /(?:fs\.readFile|fs\.readFileSync|open\(|path\.join\().*req\.(?:params|query|body)/,
    title: 'Potential Path Traversal Vulnerability',
    message: () => 'User input passed directly to file system APIs without path normalization or boundary checking.',
    fixSuggestion: () => 'Sanitize path inputs using `path.basename()` and verify the target path resides strictly inside the allowed root directory.'
  },

  // --- MEMORY LEAKS & BUGS ---
  {
    id: 'BUG-001',
    name: 'Missing Event Listener / Timer Cleanup in React Effect',
    category: 'CODE_SMELL',
    severity: 'warning',
    languages: ['ts', 'js', 'tsx', 'jsx'],
    pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*(?:setInterval|addEventListener)[^}]*\}\s*,\s*\[[^\]]*\]\s*\)/,
    title: 'Potential Memory Leak in React useEffect',
    message: () => '`setInterval` or `addEventListener` registered inside `useEffect` without returning a cleanup function.',
    fixSuggestion: () => 'Return a cleanup function from `useEffect` (e.g. `return () => clearInterval(id);` or `removeEventListener`).'
  },
  {
    id: 'BUG-002',
    name: 'Swallowed Exception (Empty Catch Block)',
    category: 'CODE_SMELL',
    severity: 'warning',
    languages: ['ts', 'js', 'py', 'go'],
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}|except(?:\s+\w+)?:\s*pass/,
    title: 'Silent Exception Suppression',
    message: () => 'Empty catch block silently hides operational errors, making production debugging extremely difficult.',
    fixSuggestion: () => 'Log the error with a logger or rethrow it (`console.error(err)` or throw custom error).'
  },
  {
    id: 'BUG-003',
    name: 'Floating Async Promise / Unhandled Rejection',
    category: 'BUG',
    severity: 'warning',
    languages: ['ts', 'js'],
    pattern: /(?:async\s+function|\([^)]*\)\s*=>\s*\{)\s*(?:[a-zA-Z0-9_]+\.(?:then|catch)\(|fetch\(|axios\.)[^;\n]*;(?!\s*await)/,
    title: 'Floating Async Promise without await or catch',
    message: () => 'Async promise execution started without `await` or `.catch()`. Rejections will result in unhandled promise rejection warnings.',
    fixSuggestion: () => 'Add `await` to handle resolution/error, or attach `.catch(handleError)` handler.'
  },

  // --- PERFORMANCE ISSUES ---
  {
    id: 'PERF-001',
    name: 'N+1 Query Pattern inside Loop',
    category: 'PERFORMANCE',
    severity: 'critical',
    languages: ['ts', 'js', 'py'],
    pattern: /(?:for|while|\.map|\.forEach)\s*\([^)]*\)\s*\{[^}]*(?:await\s+db\.|await\s+prisma\.|await\s+fetch|cursor\.execute)/,
    title: 'N+1 Database / API Query in Loop',
    message: () => 'Database query or async HTTP call invoked inside a loop. This leads to massive performance degradation with N+1 roundtrips.',
    fixSuggestion: () => 'Batch query parameters outside the loop using `WHERE id IN (...)` or `Promise.all()`.'
  },
  {
    id: 'PERF-002',
    name: 'Blocking Synchronous I/O in Request Handler',
    category: 'PERFORMANCE',
    severity: 'warning',
    languages: ['ts', 'js'],
    pattern: /(?:fs\.readFileSync|fs\.writeFileSync|fs\.existsSync)\s*\(/,
    title: 'Synchronous File I/O in Async Server Context',
    message: () => 'Synchronous file system operations block Node.js single-threaded event loop, freezing all concurrent requests.',
    fixSuggestion: () => 'Use asynchronous file system calls (`fs.promises.readFile`) with `await`.'
  },

  // --- TYPE SAFETY & QUALITY ---
  {
    id: 'TYP-001',
    name: 'Excessive TypeScript Any Type',
    category: 'TYPE_SAFETY',
    severity: 'info',
    languages: ['ts', 'tsx'],
    pattern: /:\s*any\b|\bas\s+any\b/,
    title: 'Type Safety Violation (Explicit Any)',
    message: () => 'Using `any` disables TypeScript compile-time type checking and reduces code robustness.',
    fixSuggestion: () => 'Replace `any` with specific interface types, generic constraints, or `unknown` with type guards.'
  },
  {
    id: 'QUAL-001',
    name: 'Leftover Debug Statements',
    category: 'BEST_PRACTICE',
    severity: 'info',
    languages: ['ts', 'js', 'py'],
    pattern: /\b(?:console\.log|debugger;|print\(|import pdb; pdb\.set_trace\(\))/,
    title: 'Leftover Console / Debug Statement',
    message: () => 'Debug output left in source file.',
    fixSuggestion: () => 'Remove debug statements or replace with structured server logging (e.g., Winston, Pino).'
  }
];

export function runStaticCodeAnalysis(
  files: { filename: string; content?: string; patch?: string }[]
): StaticIssue[] {
  const issues: StaticIssue[] = [];

  files.forEach((file) => {
    const ext = file.filename.split('.').pop()?.toLowerCase() || '';
    const fileContent = file.content || parsePatchToContent(file.patch || '');

    if (!fileContent) return;

    const lines = fileContent.split('\n');

    STATIC_RULES.forEach((rule) => {
      // Check if language matches
      if (rule.languages.length > 0 && !rule.languages.includes(ext) && !rule.languages.includes('*')) {
        return;
      }

      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        const match = rule.pattern.exec(lineText);
        if (match) {
          issues.push({
            id: `${rule.id}-${file.filename}-${lineNum}`,
            file: file.filename,
            line: lineNum,
            column: match.index + 1,
            ruleId: rule.id,
            severity: rule.severity,
            category: rule.category,
            title: rule.title,
            message: rule.message(match),
            codeSnippet: lineText.trim(),
            fixSuggestion: rule.fixSuggestion(match),
          });
        }
      });
    });
  });

  return issues;
}

function parsePatchToContent(patch: string): string {
  // Extracts added/modified lines from unified git diff patch
  const patchLines = patch.split('\n');
  const codeLines: string[] = [];

  for (const line of patchLines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      codeLines.push(line.substring(1));
    } else if (!line.startsWith('-') && !line.startsWith('@@') && !line.startsWith('---')) {
      codeLines.push(line);
    }
  }

  return codeLines.join('\n');
}
