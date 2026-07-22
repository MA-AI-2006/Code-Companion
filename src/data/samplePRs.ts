import { SamplePR } from '../types';

export const SAMPLE_PRS: SamplePR[] = [
  {
    id: 'pr-vulnerable-payment',
    title: 'feat(payments): Add user payment processing and SQL query optimization',
    description: 'Implements Stripe payment webhook handler and DB user lookup.',
    repoOwner: 'acme-corp',
    repoName: 'backend-api',
    pullNumber: 142,
    author: 'johndoe-dev',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    headBranch: 'feature/payment-gateway',
    baseBranch: 'main',
    commitSha: '7f9a2e1',
    files: [
      {
        filename: 'src/controllers/paymentController.ts',
        status: 'modified',
        additions: 38,
        deletions: 12,
        patch: `@@ -1,15 +1,41 @@
 import { Request, Response } from 'express';
 import db from '../db/connection';
 
+// STRIPE SECRET KEY
+const STRIPE_SECRET_KEY = "sk-live-51NxABC1234567890SecretKeyForProd12345";
+
 export async function processPayment(req: Request, res: Response) {
   const { userId, amount, cardNumber } = req.body;

-  // Legacy payment check
-  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
+  // Quick lookup without parameterized query for speed
+  const query = "SELECT * FROM users WHERE id = '" + userId + "' AND active = 1";
+  const user = await db.raw(query);

   if (!user) {
     return res.status(404).json({ error: 'User not found' });
   }

+  try {
+    // Evaluate custom dynamic pricing formula
+    const discountCode = req.body.discountFormula;
+    const finalAmount = eval("amount " + discountCode);
+
+    // Log raw transaction details
+    console.log('Processing payment for user:', userId, 'Card:', cardNumber, 'Amount:', finalAmount);

+    // Execute DB update inside loop
+    for (let i = 0; i < req.body.items.length; i++) {
+      await db.query("UPDATE inventory SET stock = stock - 1 WHERE item_id = " + req.body.items[i].id);
+    }
+
+    res.json({ status: 'success', amount: finalAmount });
+  } catch (err) {
+    // Ignore errors
+  }
 }`,
        content: `import { Request, Response } from 'express';
import db from '../db/connection';

// STRIPE SECRET KEY
const STRIPE_SECRET_KEY = "sk-live-51NxABC1234567890SecretKeyForProd12345";

export async function processPayment(req: Request, res: Response) {
  const { userId, amount, cardNumber } = req.body;

  // Quick lookup without parameterized query for speed
  const query = "SELECT * FROM users WHERE id = '" + userId + "' AND active = 1";
  const user = await db.raw(query);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    // Evaluate custom dynamic pricing formula
    const discountCode = req.body.discountFormula;
    const finalAmount = eval("amount " + discountCode);

    // Log raw transaction details
    console.log('Processing payment for user:', userId, 'Card:', cardNumber, 'Amount:', finalAmount);

    // Execute DB update inside loop
    for (let i = 0; i < req.body.items.length; i++) {
      await db.query("UPDATE inventory SET stock = stock - 1 WHERE item_id = " + req.body.items[i].id);
    }

    res.json({ status: 'success', amount: finalAmount });
  } catch (err) {
    // Ignore errors
  }
}`
      }
    ]
  },
  {
    id: 'pr-react-dashboard-leaks',
    title: 'fix(ui): Real-time analytics dashboard component update',
    description: 'Adds WebSocket connection and live interval polling for user activity feed.',
    repoOwner: 'acme-corp',
    repoName: 'frontend-web',
    pullNumber: 89,
    author: 'sarah-frontend',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    headBranch: 'fix/analytics-polling',
    baseBranch: 'main',
    commitSha: '9c3b11f',
    files: [
      {
        filename: 'src/components/AnalyticsDashboard.tsx',
        status: 'modified',
        additions: 24,
        deletions: 8,
        patch: `@@ -10,12 +10,28 @@ export function AnalyticsDashboard() {
   const [metrics, setMetrics] = useState<any>([]);

   useEffect(() => {
-    fetchMetrics().then(setMetrics);
+    // Poll metrics every 2 seconds
+    setInterval(() => {
+      fetch('/api/metrics').then(res => res.json()).then(data => {
+        setMetrics(data);
+      });
+    }, 2000);
+
+    window.addEventListener('resize', () => {
+      console.log('Window resized:', window.innerWidth);
+    });
   }, []);

+  const renderChart = () => {
+    // Re-calculating expensive math on every render
+    const calculatedData = metrics.map((m: any) => {
+      return m.value * 1.5;
+    });
+    return <div dangerouslySetInnerHTML={{ __html: \`<span>Chart Total: \${calculatedData.reduce((a:any, b:any) => a+b, 0)}</span>\` }} />;
+  };

   return (
-    <div>Dashboard</div>
+    <div>{renderChart()}</div>
   );
 }`,
        content: `import React, { useState, useEffect } from 'react';

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<any>([]);

  useEffect(() => {
    // Poll metrics every 2 seconds
    setInterval(() => {
      fetch('/api/metrics').then(res => res.json()).then(data => {
        setMetrics(data);
      });
    }, 2000);

    window.addEventListener('resize', () => {
      console.log('Window resized:', window.innerWidth);
    });
  }, []);

  const renderChart = () => {
    // Re-calculating expensive math on every render
    const calculatedData = metrics.map((m: any) => {
      return m.value * 1.5;
    });
    return <div dangerouslySetInnerHTML={{ __html: \`<span>Chart Total: \${calculatedData.reduce((a:any, b:any) => a+b, 0)}</span>\` }} />;
  };

  return (
    <div>{renderChart()}</div>
  );
}`
      }
    ]
  },
  {
    id: 'pr-clean-refactor',
    title: 'refactor(auth): Migrate JWT verification to modern async crypto utils',
    description: 'Clean refactoring with strict TypeScript types, proper error handling, and unit test coverage.',
    repoOwner: 'acme-corp',
    repoName: 'auth-service',
    pullNumber: 210,
    author: 'alex-sec',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    headBranch: 'refactor/jwt-async',
    baseBranch: 'main',
    commitSha: '3a1d90e',
    files: [
      {
        filename: 'src/utils/jwt.ts',
        status: 'modified',
        additions: 22,
        deletions: 15,
        patch: `@@ -1,15 +1,22 @@
 import { jwtVerify, SignJWT } from 'jose';

-export function verifyTokenSync(token: string, secret: string) {
-  return jwt.verify(token, secret);
-}
+export interface TokenPayload {
+  sub: string;
+  role: 'admin' | 'user';
+  iat: number;
+  exp: number;
+}

-export async function verifyAuthHeader(header?: string): Promise<TokenPayload | null> {
-  if (!header || !header.startsWith('Bearer ')) {
+export async function verifyAuthToken(token: string, secretKey: Uint8Array): Promise<TokenPayload | null> {
+  if (!token) return null;
+  
+  try {
+    const { payload } = await jwtVerify(token, secretKey, {
+      algorithms: ['HS256'],
+    });
+    return payload as unknown as TokenPayload;
+  } catch (err) {
+    console.error('JWT verification failed:', err instanceof Error ? err.message : err);
     return null;
   }
 }`,
        content: `import { jwtVerify, SignJWT } from 'jose';

export interface TokenPayload {
  sub: string;
  role: 'admin' | 'user';
  iat: number;
  exp: number;
}

export async function verifyAuthToken(token: string, secretKey: Uint8Array): Promise<TokenPayload | null> {
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as TokenPayload;
  } catch (err) {
    console.error('JWT verification failed:', err instanceof Error ? err.message : err);
    return null;
  }
}`
      }
    ]
  }
];
