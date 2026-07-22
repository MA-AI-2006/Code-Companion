import crypto from 'crypto';
import { ReviewResult, InlineReviewComment } from '../types.js';

export function validateWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!secret) return true; // If no secret configured, allow bypass
  if (!signatureHeader) return false;

  try {
    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') return false;

    const signature = parts[1];
    const hmac = crypto.createHmac('sha256', secret);
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const digest = hmac.update(bodyStr).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

export async function postPullRequestReviewToGitHub(
  reviewResult: ReviewResult,
  githubToken: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!githubToken) {
    return { success: false, error: 'GitHub Personal Access Token is required to post review comments.' };
  }

  const { repoOwner, repoName, prNumber, verdict, score, summary, inlineComments, positiveHighlights } = reviewResult;

  // Format the main review body with Markdown badges and formatting
  let eventStatus = 'COMMENT';
  let verdictEmoji = '💬';

  if (verdict === 'APPROVE') {
    eventStatus = 'APPROVE';
    verdictEmoji = '✅';
  } else if (verdict === 'REQUEST_CHANGES') {
    eventStatus = 'REQUEST_CHANGES';
    verdictEmoji = '🚨';
  }

  const markdownBody = `## ${verdictEmoji} Automated AI Code Reviewer

**Verdict:** \`${verdict}\` | **Overall Quality Score:** \`${score}/100\`

---

### Executive Summary
${summary}

### Key Category Scores
${reviewResult.categoriesBreakdown.map(c => `- **${c.category}**: \`${c.score}/100\` (${c.status}) - ${c.details}`).join('\n')}

### Positive Highlights
${positiveHighlights.map(h => `- ✨ ${h}`).join('\n')}

---
*Powered by Google Gemini 3.6 Flash & Hybrid AST Static Linter Engine.*`;

  // Format comments array for GitHub API
  const formattedComments = inlineComments.map(c => {
    let commentBody = `### ${c.severity === 'CRITICAL' ? '🚨' : c.severity === 'WARNING' ? '⚠️' : '💡'} [${c.severity}] ${c.title}\n\n${c.comment}`;
    
    if (c.suggestedCode) {
      commentBody += `\n\n\`\`\`suggestion\n${c.suggestedCode}\n\`\`\``;
    }

    return {
      path: c.path,
      line: c.line,
      side: c.side || 'RIGHT',
      body: commentBody
    };
  });

  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}/reviews`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'AI-Studio-Code-Reviewer'
      },
      body: JSON.stringify({
        event: eventStatus,
        body: markdownBody,
        comments: formattedComments
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("GitHub API Review Error response:", data);
      return { success: false, error: data.message || `GitHub API error (${response.status})` };
    }

    return {
      success: true,
      url: data.html_url || `https://github.com/${repoOwner}/${repoName}/pull/${prNumber}`
    };
  } catch (err: any) {
    console.error("Failed posting review to GitHub:", err);
    return { success: false, error: err.message || 'Network error connecting to GitHub API.' };
  }
}

export async function fetchPullRequestFromGitHub(
  repoOwner: string,
  repoName: string,
  prNumber: number,
  githubToken?: string
): Promise<{ title: string; author: string; headBranch: string; baseBranch: string; commitSha: string; files: { filename: string; patch?: string; content?: string }[] } | null> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'AI-Studio-Code-Reviewer'
  };

  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  try {
    // 1. Fetch PR metadata
    const prRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}`, { headers });
    if (!prRes.ok) return null;
    const prData = await prRes.json();

    // 2. Fetch PR files
    const filesRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}/files`, { headers });
    if (!filesRes.ok) return null;
    const filesData = await filesRes.json();

    const files = filesData.map((f: any) => ({
      filename: f.filename,
      patch: f.patch || '',
      content: ''
    }));

    return {
      title: prData.title || `PR #${prNumber}`,
      author: prData.user?.login || 'unknown',
      headBranch: prData.head?.ref || 'feature',
      baseBranch: prData.base?.ref || 'main',
      commitSha: prData.head?.sha || 'latest',
      files
    };
  } catch (err) {
    console.error("Failed fetching PR from GitHub API:", err);
    return null;
  }
}
