export type Severity = 'CRITICAL' | 'WARNING' | 'SUGGESTION' | 'NITPICK';

export type IssueCategory = 
  | 'SECURITY' 
  | 'BUG' 
  | 'PERFORMANCE' 
  | 'CODE_SMELL' 
  | 'BEST_PRACTICE' 
  | 'TYPE_SAFETY' 
  | 'ACCESSIBILITY';

export type ReviewVerdict = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

export interface StaticIssue {
  id: string;
  file: string;
  line: number;
  column?: number;
  ruleId: string;
  severity: 'critical' | 'warning' | 'info';
  category: IssueCategory;
  title: string;
  message: string;
  codeSnippet: string;
  fixSuggestion?: string;
}

export interface InlineReviewComment {
  id: string;
  path: string;
  line: number;
  side: 'RIGHT' | 'LEFT';
  severity: Severity;
  category: IssueCategory;
  title: string;
  comment: string;
  suggestedCode?: string;
}

export interface CategoryScore {
  category: string;
  score: number; // 0 to 100
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL_RISK';
  details: string;
}

export interface ReviewResult {
  id: string;
  prTitle: string;
  prNumber: number;
  repoName: string;
  repoOwner: string;
  author: string;
  authorAvatar?: string;
  headBranch: string;
  baseBranch: string;
  commitSha: string;
  score: number;
  verdict: ReviewVerdict;
  summary: string;
  categoriesBreakdown: CategoryScore[];
  staticIssues: StaticIssue[];
  inlineComments: InlineReviewComment[];
  positiveHighlights: string[];
  createdAt: string;
  postedToGitHub?: boolean;
  githubReviewUrl?: string;
  processingTimeMs: number;
}

export interface WebhookEventLog {
  id: string;
  timestamp: string;
  event: string; // e.g. 'pull_request', 'ping', 'push'
  action?: string; // e.g. 'opened', 'synchronize'
  repoName: string;
  repoOwner: string;
  pullNumber?: number;
  prTitle?: string;
  sender: string;
  senderAvatar?: string;
  signatureHeader?: string;
  signatureValid: boolean;
  processingTimeMs: number;
  status: 'SUCCESS' | 'IGNORED' | 'ERROR';
  reviewResult?: ReviewResult;
  errorMessage?: string;
  rawPayload: Record<string, any>;
}

export interface ReviewerSettings {
  githubToken: string;
  webhookSecret: string;
  enableAutoPost: boolean;
  strictness: 'lax' | 'standard' | 'strict' | 'paranoid';
  minSeverityToComment: Severity;
  enabledRules: {
    security: boolean;
    performance: boolean;
    codeSmells: boolean;
    typeSafety: boolean;
    memoryLeaks: boolean;
    owaspTop10: boolean;
  };
  customPromptInstructions: string;
  autoApproveScoreThreshold: number; // e.g. 85
}

export interface SamplePR {
  id: string;
  title: string;
  description: string;
  repoOwner: string;
  repoName: string;
  pullNumber: number;
  author: string;
  authorAvatar: string;
  headBranch: string;
  baseBranch: string;
  commitSha: string;
  files: {
    filename: string;
    status: 'added' | 'modified' | 'deleted';
    additions: number;
    deletions: number;
    patch: string;
    content: string;
  }[];
}

// ==========================================
// SIMPLIFIED CODE REVIEWER & GENERATOR TYPES
// ==========================================

export interface CodeErrorDetail {
  title: string;
  description: string;
  lineNumber?: number;
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
}

export interface CodeReviewResponse {
  detectedLanguage: string;
  hasErrors: boolean;
  statusText: string;
  summary: string;
  errors: CodeErrorDetail[];
  correctedCode: string;
  expectedOutput: string;
}

export interface CodeGenerationResponse {
  language: string;
  generatedCode: string;
  explanation: string;
  expectedOutput: string;
}

export interface SharedSnippet {
  id: string;
  createdAt: string;
  mode: 'review' | 'generate';
  selectedLanguage: string;
  inputCode?: string;
  questionStatement?: string;
  reviewResult?: CodeReviewResponse;
  generationResult?: CodeGenerationResponse;
}

