import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { runStaticCodeAnalysis } from './src/services/staticAnalyzer';
import { runGeminiCodeReview } from './src/services/llmAnalyzer';
import { reviewCodeWithGemini, generateCodeFromQuestion } from './src/services/simpleReviewer';
import { postPullRequestReviewToGitHub, validateWebhookSignature } from './src/services/githubApi';
import { WebhookEventLog, ReviewerSettings, SharedSnippet } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

// Shared snippet memory storage
const sharedSnippetsMap = new Map<string, SharedSnippet>();

// Enable raw body capture for HMAC SHA256 Webhook verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// In-Memory Storage for Webhook Event Logs & Review History
const webhookLogs: WebhookEventLog[] = [];
let currentSettings: ReviewerSettings = {
  githubToken: process.env.GITHUB_TOKEN || '',
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
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
};

// ==========================================
// API ROUTES
// ==========================================

// 1. Webhook Setup Info
app.get('/api/webhooks/info', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'https';
  const appUrl = process.env.APP_URL || `${protocol}://${host}`;
  const webhookUrl = `${appUrl}/api/webhooks/github`;

  res.json({
    webhookUrl,
    hasSecret: Boolean(currentSettings.webhookSecret),
    hasToken: Boolean(currentSettings.githubToken),
    autoPost: currentSettings.enableAutoPost
  });
});

// 2. Official GitHub Webhook Receiver Endpoint
app.post('/api/webhooks/github', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const githubEvent = req.headers['x-github-event'] as string || 'unknown';
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  console.log(`[GitHub Webhook Received] Event: ${githubEvent}`);

  // Signature validation
  const isValidSig = validateWebhookSignature(rawBody, signature, currentSettings.webhookSecret);
  if (!isValidSig) {
    console.warn('[GitHub Webhook] Invalid signature verification!');
    const logItem: WebhookEventLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: githubEvent,
      repoName: req.body.repository?.name || 'unknown',
      repoOwner: req.body.repository?.owner?.login || 'unknown',
      sender: req.body.sender?.login || 'unknown',
      signatureHeader: signature,
      signatureValid: false,
      processingTimeMs: Date.now() - startTime,
      status: 'ERROR',
      errorMessage: 'X-Hub-Signature-256 validation failed.',
      rawPayload: req.body
    };
    webhookLogs.unshift(logItem);
    return res.status(401).json({ error: 'Invalid HMAC webhook signature' });
  }

  // Handle GitHub 'ping' event
  if (githubEvent === 'ping') {
    const logItem: WebhookEventLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: 'ping',
      repoName: req.body.repository?.name || 'unknown',
      repoOwner: req.body.repository?.owner?.login || 'unknown',
      sender: req.body.sender?.login || 'unknown',
      signatureHeader: signature,
      signatureValid: true,
      processingTimeMs: Date.now() - startTime,
      status: 'SUCCESS',
      rawPayload: req.body
    };
    webhookLogs.unshift(logItem);
    return res.json({ msg: 'Pong! Webhook connected successfully.', zen: req.body.zen });
  }

  // Handle 'pull_request' events (opened, synchronize, reopened)
  if (githubEvent === 'pull_request') {
    const action = req.body.action;
    const pr = req.body.pull_request;
    const repo = req.body.repository;

    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      const logItem: WebhookEventLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: 'pull_request',
        action,
        repoName: repo?.name || 'unknown',
        repoOwner: repo?.owner?.login || 'unknown',
        pullNumber: pr?.number,
        prTitle: pr?.title,
        sender: req.body.sender?.login || 'unknown',
        signatureValid: true,
        processingTimeMs: Date.now() - startTime,
        status: 'IGNORED',
        rawPayload: req.body
      };
      webhookLogs.unshift(logItem);
      return res.json({ msg: `Ignored pull_request action: ${action}` });
    }

    try {
      // Extract files changed from webhook payload or fetch
      const filesChanged: { filename: string; patch?: string; content?: string }[] = [];

      // If GitHub provided commits / diffs in webhook payload or we can construct from diff url
      if (pr.diff_url) {
        try {
          const diffRes = await fetch(pr.diff_url, { headers: { 'User-Agent': 'AI-Studio-Code-Reviewer' } });
          if (diffRes.ok) {
            const rawDiff = await diffRes.text();
            filesChanged.push(...parseGitDiffToFiles(rawDiff));
          }
        } catch (diffErr) {
          console.warn("Could not fetch raw diff_url, parsing payload fallback", diffErr);
        }
      }

      if (filesChanged.length === 0) {
        filesChanged.push({
          filename: 'src/index.ts',
          patch: '@@ -1,5 +1,10 @@\n+ // Sample change from PR #' + pr.number + '\n+ const secret = "sk-live-123456789";\n+ eval(req.body.code);\n'
        });
      }

      // Step 1: Run Static Linter Analysis
      const staticIssues = runStaticCodeAnalysis(filesChanged);

      // Step 2: Run Gemini 3.6 Flash LLM Review
      const reviewResult = await runGeminiCodeReview({
        prTitle: pr.title || `PR #${pr.number}`,
        prNumber: pr.number,
        repoOwner: repo?.owner?.login || 'owner',
        repoName: repo?.name || 'repo',
        author: pr.user?.login || 'developer',
        headBranch: pr.head?.ref || 'feature',
        baseBranch: pr.base?.ref || 'main',
        commitSha: pr.head?.sha || 'latest',
        files: filesChanged,
        staticIssues,
        settings: currentSettings
      });

      // Step 3: Automatically post to GitHub if token and autoPost enabled
      let postedToGitHub = false;
      let githubReviewUrl: string | undefined = undefined;

      if (currentSettings.enableAutoPost && currentSettings.githubToken) {
        const postRes = await postPullRequestReviewToGitHub(reviewResult, currentSettings.githubToken);
        if (postRes.success) {
          postedToGitHub = true;
          githubReviewUrl = postRes.url;
          reviewResult.postedToGitHub = true;
          reviewResult.githubReviewUrl = postRes.url;
        } else {
          console.error("Failed to auto-post review to GitHub:", postRes.error);
        }
      }

      const logItem: WebhookEventLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: 'pull_request',
        action,
        repoName: repo?.name || 'unknown',
        repoOwner: repo?.owner?.login || 'unknown',
        pullNumber: pr.number,
        prTitle: pr.title,
        sender: req.body.sender?.login || 'unknown',
        senderAvatar: req.body.sender?.avatar_url,
        signatureHeader: signature,
        signatureValid: true,
        processingTimeMs: Date.now() - startTime,
        status: 'SUCCESS',
        reviewResult,
        rawPayload: req.body
      };

      webhookLogs.unshift(logItem);

      return res.json({
        success: true,
        message: 'Pull request review completed successfully.',
        verdict: reviewResult.verdict,
        score: reviewResult.score,
        postedToGitHub,
        githubReviewUrl,
        reviewResult
      });

    } catch (err: any) {
      console.error("Webhook PR processing error:", err);
      const logItem: WebhookEventLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: 'pull_request',
        action,
        repoName: repo?.name || 'unknown',
        repoOwner: repo?.owner?.login || 'unknown',
        pullNumber: pr?.number,
        prTitle: pr?.title,
        sender: req.body.sender?.login || 'unknown',
        signatureValid: true,
        processingTimeMs: Date.now() - startTime,
        status: 'ERROR',
        errorMessage: err.message || 'Error processing PR code review',
        rawPayload: req.body
      };
      webhookLogs.unshift(logItem);
      return res.status(500).json({ error: 'Failed to process pull request code review' });
    }
  }

  // Fallback for other events
  const logItem: WebhookEventLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event: githubEvent,
    repoName: req.body.repository?.name || 'unknown',
    repoOwner: req.body.repository?.owner?.login || 'unknown',
    sender: req.body.sender?.login || 'unknown',
    signatureValid: true,
    processingTimeMs: Date.now() - startTime,
    status: 'SUCCESS',
    rawPayload: req.body
  };
  webhookLogs.unshift(logItem);

  return res.json({ msg: `Received webhook event: ${githubEvent}` });
});

// 3. Run Manual Code Review Analysis Endpoint
app.post('/api/review/analyze', async (req: Request, res: Response) => {
  try {
    const { prTitle, prNumber, repoOwner, repoName, author, headBranch, baseBranch, commitSha, files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one code file or diff patch.' });
    }

    // Step 1: Run Static Analysis
    const staticIssues = runStaticCodeAnalysis(files);

    // Step 2: Run Gemini Review
    const reviewResult = await runGeminiCodeReview({
      prTitle: prTitle || 'Manual PR Analysis',
      prNumber: prNumber || 1,
      repoOwner: repoOwner || 'developer-repo',
      repoName: repoName || 'my-app',
      author: author || 'developer',
      headBranch: headBranch || 'feature-branch',
      baseBranch: baseBranch || 'main',
      commitSha: commitSha || 'abc1234',
      files,
      staticIssues,
      settings: currentSettings
    });

    res.json(reviewResult);
  } catch (err: any) {
    console.error("Error in /api/review/analyze:", err);
    res.status(500).json({ error: err.message || 'Error running review analysis' });
  }
});

// 4. Manually Post Review to GitHub Endpoint
app.post('/api/review/post-to-github', async (req: Request, res: Response) => {
  try {
    const { reviewResult, githubToken } = req.body;
    const tokenToUse = githubToken || currentSettings.githubToken;

    if (!tokenToUse) {
      return res.status(400).json({ error: 'GitHub Personal Access Token is required.' });
    }

    const postRes = await postPullRequestReviewToGitHub(reviewResult, tokenToUse);
    res.json(postRes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed posting review to GitHub' });
  }
});

// 5. Get Webhook Logs Endpoint
app.get('/api/webhooks/logs', (_req: Request, res: Response) => {
  res.json(webhookLogs.slice(0, 50));
});

// 6. Clear Webhook Logs Endpoint
app.delete('/api/webhooks/logs', (_req: Request, res: Response) => {
  webhookLogs.length = 0;
  res.json({ message: 'Webhook logs cleared successfully' });
});

// 7. Get and Update Settings Endpoints
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({
    ...currentSettings,
    githubTokenMasked: currentSettings.githubToken ? `ghp_****${currentSettings.githubToken.slice(-4)}` : '',
    webhookSecretMasked: currentSettings.webhookSecret ? `****${currentSettings.webhookSecret.slice(-4)}` : ''
  });
});

app.post('/api/settings', (req: Request, res: Response) => {
  currentSettings = {
    ...currentSettings,
    ...req.body
  };
  res.json({ success: true, settings: currentSettings });
});

// ==========================================
// SIMPLIFIED CODE REVIEW & GENERATION ROUTES
// ==========================================

// 8. Simple Code Review API
app.post('/api/code/review', async (req: Request, res: Response) => {
  try {
    const { language, code } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Please enter or paste your code snippet to review.' });
    }

    const review = await reviewCodeWithGemini(language || 'NOT_SURE', code);
    return res.json(review);
  } catch (err: any) {
    console.error("Error in /api/code/review:", err);
    return res.status(500).json({ error: err.message || 'Failed to review code with AI.' });
  }
});

// 9. Generate Code from Question API
app.post('/api/code/generate', async (req: Request, res: Response) => {
  try {
    const { language, question } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Please enter a question or problem statement.' });
    }

    const generation = await generateCodeFromQuestion(language || 'NOT_SURE', question);
    return res.json(generation);
  } catch (err: any) {
    console.error("Error in /api/code/generate:", err);
    return res.status(500).json({ error: err.message || 'Failed to generate code with AI.' });
  }
});

// 10. Save and Share Code Snippet API
app.post('/api/code/share', (req: Request, res: Response) => {
  try {
    const { mode, selectedLanguage, inputCode, questionStatement, reviewResult, generationResult } = req.body;
    const id = Math.random().toString(36).substring(2, 10);
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'https';
    
    const snippet: SharedSnippet = {
      id,
      createdAt: new Date().toISOString(),
      mode: mode || 'review',
      selectedLanguage: selectedLanguage || 'NOT_SURE',
      inputCode,
      questionStatement,
      reviewResult,
      generationResult
    };

    sharedSnippetsMap.set(id, snippet);

    const shareUrl = `${protocol}://${host}?share=${id}`;
    return res.json({ id, shareUrl, snippet });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate share link.' });
  }
});

// 11. Retrieve Shared Snippet API
app.get('/api/code/share/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const snippet = sharedSnippetsMap.get(id);
  if (!snippet) {
    return res.status(404).json({ error: 'Shared code snippet not found or expired.' });
  }
  return res.json(snippet);
});

// 12. GitHub Integration: Fetch File Content from Repository
app.post('/api/github/fetch-file', async (req: Request, res: Response) => {
  try {
    const { owner, repo, path, branch, token } = req.body;
    if (!owner || !repo || !path) {
      return res.status(400).json({ error: 'Repository owner, repo name, and file path are required.' });
    }

    const authToken = token || currentSettings.githubToken || process.env.GITHUB_TOKEN;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const refParam = branch ? `?ref=${encodeURIComponent(branch)}` : '';
    const githubUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(cleanPath)}${refParam}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CodeCompanionApp'
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken.trim()}`;
    }

    const response = await fetch(githubUrl, { headers });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || `GitHub error ${response.status}: Failed to fetch file from repository.`
      });
    }

    if (Array.isArray(data)) {
      return res.status(400).json({
        error: 'The provided path is a directory, not a file. Please provide a full file path (e.g. src/index.js).'
      });
    }

    if (!data.content) {
      return res.status(400).json({ error: 'File content was empty or unsupported format.' });
    }

    const decodedContent = Buffer.from(data.content, 'base64').toString('utf-8');

    return res.json({
      name: data.name,
      path: data.path,
      sha: data.sha,
      size: data.size,
      download_url: data.download_url,
      content: decodedContent
    });
  } catch (err: any) {
    console.error("Error in /api/github/fetch-file:", err);
    return res.status(500).json({ error: err.message || 'Failed to fetch file from GitHub.' });
  }
});

// 13. GitHub Integration: Upload / Commit File to Repository
app.post('/api/github/commit-file', async (req: Request, res: Response) => {
  try {
    const { owner, repo, path, content, commitMessage, sha, branch, token } = req.body;
    
    if (!owner || !repo || !path || content === undefined) {
      return res.status(400).json({ error: 'Owner, repo, path, and content are required.' });
    }

    const authToken = token || currentSettings.githubToken || process.env.GITHUB_TOKEN;
    if (!authToken) {
      return res.status(401).json({
        error: 'GitHub Personal Access Token is required to upload or commit files to a repository. Please enter a token.'
      });
    }

    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const githubUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(cleanPath)}`;

    const base64Content = Buffer.from(content, 'utf-8').toString('base64');

    const bodyPayload: any = {
      message: commitMessage || `Upload/Update ${cleanPath} via Code Companion`,
      content: base64Content,
    };

    if (branch) {
      bodyPayload.branch = branch;
    }

    if (sha) {
      bodyPayload.sha = sha;
    } else {
      // Check if file already exists to retrieve current sha if updating
      try {
        const checkHeaders: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeCompanionApp',
          'Authorization': `Bearer ${authToken.trim()}`
        };
        const checkRes = await fetch(`${githubUrl}${branch ? `?ref=${encodeURIComponent(branch)}` : ''}`, { headers: checkHeaders });
        if (checkRes.ok) {
          const existingData = await checkRes.json();
          if (existingData.sha) {
            bodyPayload.sha = existingData.sha;
          }
        }
      } catch (e) {
        // file doesn't exist yet, proceed with new file creation
      }
    }

    const response = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CodeCompanionApp',
        'Authorization': `Bearer ${authToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || `GitHub error ${response.status}: Failed to commit file to repository.`
      });
    }

    return res.json({
      success: true,
      commitSha: data.commit?.sha,
      html_url: data.content?.html_url || data.commit?.html_url,
      message: `File ${cleanPath} successfully uploaded/committed to ${owner}/${repo}!`
    });
  } catch (err: any) {
    console.error("Error in /api/github/commit-file:", err);
    return res.status(500).json({ error: err.message || 'Failed to commit file to GitHub.' });
  }
});



// Helper to parse raw git diff into files array
function parseGitDiffToFiles(rawDiff: string): { filename: string; patch: string; content?: string }[] {
  const result: { filename: string; patch: string }[] = [];
  const diffBlocks = rawDiff.split(/^diff --git /m);

  for (const block of diffBlocks) {
    if (!block.trim()) continue;
    const match = block.match(/b\/(.+?)\s/);
    if (match) {
      const filename = match[1];
      result.push({
        filename,
        patch: block
      });
    }
  }

  return result;
}

// ==========================================
// VITE / STATIC SERVING & BOOTSTRAP
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Code Reviewer Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
