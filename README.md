# Code Companion 🚀

A full-stack AI Code Companion for automated code reviews, error explanations, corrected code generation, local file analysis, GitHub repository imports, and automated pull request GitHub webhooks. Powered by Gemini.

---

## 🛠️ Deploying to Vercel

You can deploy this application directly to **Vercel** with zero extra backend configuration required.

### Step 1: Push Code to GitHub / GitLab
1. Initialize git and commit your repository (if exporting or pushing):
   ```bash
   git add .
   git commit -m "Deploy Code Companion to Vercel"
   git push origin main
   ```

### Step 2: Import Project into Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** &rarr; **Project**.
2. Select your `Code Companion` repository.
3. Vercel will automatically detect the Vite project settings using `vercel.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Add Environment Variables in Vercel
In Vercel's **Environment Variables** settings section, add the following key:

| Variable Name | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API Key | **Yes** |
| `GITHUB_TOKEN` | Personal Access Token for PR comments | Optional |
| `GITHUB_WEBHOOK_SECRET` | Secret for GitHub Webhook verification | Optional |

> **How to get a Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to create a free API key.

### Step 4: Click Deploy! 🎉
Vercel will build the frontend assets into `dist/` and automatically route all `/api/*` endpoints to the serverless function handler in `api/index.ts`.

---

## ⚡ Local Development

To run locally:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.
