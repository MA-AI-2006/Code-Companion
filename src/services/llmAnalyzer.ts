import { GoogleGenAI, Type } from "@google/genai";
import { ReviewResult, StaticIssue, InlineReviewComment, ReviewerSettings } from "../types.js";

export async function runGeminiCodeReview(params: {
  prTitle: string;
  prNumber: number;
  repoOwner: string;
  repoName: string;
  author: string;
  headBranch: string;
  baseBranch: string;
  commitSha: string;
  files: { filename: string; patch?: string; content?: string }[];
  staticIssues: StaticIssue[];
  settings?: Partial<ReviewerSettings>;
}): Promise<ReviewResult> {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;

  // Prepare input diffs
  const formattedFiles = params.files.map(f => {
    return `=== FILE: ${f.filename} ===\n${f.content ? `CONTENT:\n${f.content}\n` : ''}${f.patch ? `DIFF PATCH:\n${f.patch}\n` : ''}`;
  }).join('\n\n');

  const formattedStaticIssues = params.staticIssues.map(i => 
    `[${i.severity.toUpperCase()}] File: ${i.file}:${i.line} (${i.ruleId}) ${i.title}: ${i.message}`
  ).join('\n');

  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable not found. Falling back to static-analysis review result.");
    return generateFallbackReviewResult(params, startTime, "Gemini API Key missing in environment settings.");
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `You are a Principal Software Engineer, Staff Security Auditor, and Lead Code Reviewer.
Your goal is to inspect Pull Request changes, analyze code diffs, evaluate security vulnerabilities, performance bottlenecks, architecture, type safety, and code smells.

Review Strictness: ${params.settings?.strictness || 'standard'}.
Additional User Guidelines: ${params.settings?.customPromptInstructions || 'Focus on OWASP security, memory leaks, performance, and clean code principles.'}

Static Linter / AST Findings (Correlate with these in your analysis):
${formattedStaticIssues.length > 0 ? formattedStaticIssues : 'No static linter issues found.'}

You must return a strict JSON object matching the requested schema. Provide actionable inline review comments with exact line numbers from the modified files, markdown explanations, and refactored code snippets.`;

    const prompt = `Please review the following Pull Request changes for repository "${params.repoOwner}/${params.repoName}" PR #${params.prNumber}: "${params.prTitle}" by @${params.author}.

Pull Request Code Files & Diffs:
${formattedFiles}

Provide a comprehensive review including:
1. Overall quality score (0-100)
2. Verdict: 'APPROVE', 'REQUEST_CHANGES', or 'COMMENT'
3. Summary of changes and risks
4. Category breakdown scores (Security, Performance, Code Quality, Maintainability, Architecture)
5. Line-by-line Inline Comments for specific issues or refactoring suggestions
6. Positive highlights of good practices found in the code.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: 'Overall code review score from 0 to 100' },
            verdict: { type: Type.STRING, description: 'APPROVE, REQUEST_CHANGES, or COMMENT' },
            summary: { type: Type.STRING, description: 'Concise executive summary of PR code changes' },
            categoriesBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  status: { type: Type.STRING },
                  details: { type: Type.STRING }
                },
                required: ['category', 'score', 'status', 'details']
              }
            },
            inlineComments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  path: { type: Type.STRING, description: 'Relative file path' },
                  line: { type: Type.INTEGER, description: 'Line number in file' },
                  side: { type: Type.STRING, description: 'RIGHT or LEFT' },
                  severity: { type: Type.STRING, description: 'CRITICAL, WARNING, SUGGESTION, or NITPICK' },
                  category: { type: Type.STRING, description: 'SECURITY, BUG, PERFORMANCE, CODE_SMELL, BEST_PRACTICE, TYPE_SAFETY' },
                  title: { type: Type.STRING, description: 'Short title' },
                  comment: { type: Type.STRING, description: 'Detailed markdown explanation' },
                  suggestedCode: { type: Type.STRING, description: 'Refactored code snippet suggestion' }
                },
                required: ['path', 'line', 'severity', 'category', 'title', 'comment']
              }
            },
            positiveHighlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['score', 'verdict', 'summary', 'categoriesBreakdown', 'inlineComments', 'positiveHighlights']
        }
      }
    });

    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText);

    const processingTimeMs = Date.now() - startTime;

    const inlineComments: InlineReviewComment[] = (parsed.inlineComments || []).map((c: any, index: number) => ({
      id: `comment-${index}-${Date.now()}`,
      path: c.path || (params.files[0]?.filename || 'unknown'),
      line: Number(c.line) || 1,
      side: (c.side === 'LEFT' ? 'LEFT' : 'RIGHT'),
      severity: sanitizeSeverity(c.severity),
      category: c.category || 'CODE_SMELL',
      title: c.title || 'Code Review Note',
      comment: c.comment || '',
      suggestedCode: c.suggestedCode || undefined
    }));

    return {
      id: `review-${Date.now()}`,
      prTitle: params.prTitle,
      prNumber: params.prNumber,
      repoOwner: params.repoOwner,
      repoName: params.repoName,
      author: params.author,
      authorAvatar: `https://github.com/${params.author}.png`,
      headBranch: params.headBranch,
      baseBranch: params.baseBranch,
      commitSha: params.commitSha,
      score: parsed.score ?? 75,
      verdict: (['APPROVE', 'REQUEST_CHANGES', 'COMMENT'].includes(parsed.verdict) ? parsed.verdict : 'COMMENT') as any,
      summary: parsed.summary || 'Code review analysis complete.',
      categoriesBreakdown: parsed.categoriesBreakdown || [],
      staticIssues: params.staticIssues,
      inlineComments,
      positiveHighlights: parsed.positiveHighlights || ['Clean commit history', 'Well structured diff'],
      createdAt: new Date().toISOString(),
      processingTimeMs
    };

  } catch (error: any) {
    console.error("Gemini API Review Error:", error);
    return generateFallbackReviewResult(params, startTime, error?.message || 'Error generating Gemini analysis.');
  }
}

function sanitizeSeverity(sev: string): any {
  const upper = String(sev || '').toUpperCase();
  if (['CRITICAL', 'WARNING', 'SUGGESTION', 'NITPICK'].includes(upper)) {
    return upper;
  }
  return 'WARNING';
}

function generateFallbackReviewResult(
  params: any,
  startTime: number,
  reason: string
): ReviewResult {
  const staticCount = params.staticIssues.length;
  const criticals = params.staticIssues.filter((i: any) => i.severity === 'critical').length;
  
  let verdict: any = 'APPROVE';
  let score = 90;

  if (criticals > 0) {
    verdict = 'REQUEST_CHANGES';
    score = 45;
  } else if (staticCount > 2) {
    verdict = 'COMMENT';
    score = 70;
  }

  const inlineComments: InlineReviewComment[] = params.staticIssues.map((issue: any, idx: number) => ({
    id: `static-inline-${idx}`,
    path: issue.file,
    line: issue.line,
    side: 'RIGHT',
    severity: issue.severity === 'critical' ? 'CRITICAL' : issue.severity === 'warning' ? 'WARNING' : 'SUGGESTION',
    category: issue.category,
    title: issue.title,
    comment: `${issue.message}\n\n*Identified by Static Linter Rules (${issue.ruleId})*`,
    suggestedCode: issue.fixSuggestion
  }));

  return {
    id: `review-fallback-${Date.now()}`,
    prTitle: params.prTitle,
    prNumber: params.prNumber,
    repoOwner: params.repoOwner,
    repoName: params.repoName,
    author: params.author,
    authorAvatar: `https://github.com/${params.author}.png`,
    headBranch: params.headBranch,
    baseBranch: params.baseBranch,
    commitSha: params.commitSha,
    score,
    verdict,
    summary: `Static analysis review complete (${reason}). Found ${staticCount} static issue(s).`,
    categoriesBreakdown: [
      { category: 'Security', score: criticals > 0 ? 40 : 90, status: criticals > 0 ? 'CRITICAL_RISK' : 'EXCELLENT', details: `${criticals} critical security issues detected` },
      { category: 'Code Quality', score: Math.max(30, 100 - staticCount * 15), status: 'GOOD', details: `${staticCount} linter observations` }
    ],
    staticIssues: params.staticIssues,
    inlineComments,
    positiveHighlights: ['Passed initial static syntax validation'],
    createdAt: new Date().toISOString(),
    processingTimeMs: Date.now() - startTime
  };
}
