import { GoogleGenAI, Type } from "@google/genai";
import { CodeReviewResponse, CodeGenerationResponse } from "../types.js";

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please check your configuration.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

/**
 * Review user code: Detect/verify language, analyze errors, provide corrected code and expected output.
 */
export async function reviewCodeWithGemini(
  language: string,
  code: string
): Promise<CodeReviewResponse> {
  const ai = getAiClient();

  const isNotSure = !language || language === 'NOT_SURE' || language.toLowerCase().includes('not sure');

  const systemInstruction = `You are an expert AI Code Reviewer and Debugger.
Your job is to analyze the user's code snippet:
1. Detect or verify the programming language.
2. Check if the code has any errors, syntax bugs, logic flaws, runtime exceptions, or security risks.
3. Provide a clear list of errors with line numbers and explanations.
4. Provide the fully corrected, runnable code.
5. Provide the exact expected output when the corrected code executes.

Be encouraging, clear, and precise. Return JSON strictly matching the requested schema.`;

  const prompt = `Language context specified by user: "${isNotSure ? 'Not sure / Auto-detect language' : language}".

User Code Snippet:
\`\`\`
${code}
\`\`\`

Analyze this code thoroughly and return JSON matching the schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedLanguage: {
            type: Type.STRING,
            description: 'The exact programming language detected (e.g. Python 3, JavaScript ES6, C++, Java)'
          },
          hasErrors: {
            type: Type.BOOLEAN,
            description: 'true if code has syntax errors, runtime bugs, or logic flaws, false if perfectly correct'
          },
          statusText: {
            type: Type.STRING,
            description: 'Short headline status, e.g., "Code contains 2 critical bugs" or "Code is valid and bug-free!"'
          },
          summary: {
            type: Type.STRING,
            description: 'Concise explanation of what the code does and why changes were made or why it is correct'
          },
          errors: {
            type: Type.ARRAY,
            description: 'List of errors/problems found in the code',
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                lineNumber: { type: Type.INTEGER, description: 'Approximate line number in user code if applicable' },
                severity: { type: Type.STRING, description: 'CRITICAL, WARNING, or SUGGESTION' }
              },
              required: ['title', 'description', 'severity']
            }
          },
          correctedCode: {
            type: Type.STRING,
            description: 'The complete, bug-free, corrected source code ready for execution'
          },
          expectedOutput: {
            type: Type.STRING,
            description: 'Exact expected stdout/terminal output or return value when the corrected code is executed'
          }
        },
        required: ['detectedLanguage', 'hasErrors', 'statusText', 'summary', 'errors', 'correctedCode', 'expectedOutput']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');

  return {
    detectedLanguage: parsed.detectedLanguage || (isNotSure ? 'Auto-Detected Code' : language),
    hasErrors: Boolean(parsed.hasErrors),
    statusText: parsed.statusText || (parsed.hasErrors ? 'Issues found in code' : 'Code is valid'),
    summary: parsed.summary || 'Code analysis complete.',
    errors: Array.isArray(parsed.errors) ? parsed.errors.map((e: any) => ({
      title: e.title || 'Code Observation',
      description: e.description || '',
      lineNumber: typeof e.lineNumber === 'number' ? e.lineNumber : undefined,
      severity: ['CRITICAL', 'WARNING', 'SUGGESTION'].includes(e.severity) ? e.severity : 'WARNING'
    })) : [],
    correctedCode: parsed.correctedCode || code,
    expectedOutput: parsed.expectedOutput || 'Execution completed with no output.'
  };
}

/**
 * Generate code from question statement.
 */
export async function generateCodeFromQuestion(
  language: string,
  question: string
): Promise<CodeGenerationResponse> {
  const ai = getAiClient();

  const isNotSure = !language || language === 'NOT_SURE' || language.toLowerCase().includes('not sure');

  const systemInstruction = `You are an elite AI Code Generator and Programming Tutor.
Given a user's question statement or problem request:
1. Select the requested language (or choose the best fit if not sure, like Python or JavaScript).
2. Generate clean, well-commented, efficient, production-ready code.
3. Provide a step-by-step breakdown explaining how the solution works.
4. Provide the exact expected output when the code runs.

Return JSON strictly matching the schema.`;

  const prompt = `Target Language: "${isNotSure ? 'Auto-select best language' : language}".

Question / Problem Statement:
"${question}"

Generate the complete solution code, explanation, and expected output.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          language: {
            type: Type.STRING,
            description: 'The programming language used (e.g. Python, JavaScript, C++)'
          },
          generatedCode: {
            type: Type.STRING,
            description: 'Complete, runnable solution source code'
          },
          explanation: {
            type: Type.STRING,
            description: 'Clear step-by-step explanation of how the code solves the question'
          },
          expectedOutput: {
            type: Type.STRING,
            description: 'Expected console output when running this solution'
          }
        },
        required: ['language', 'generatedCode', 'explanation', 'expectedOutput']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');

  return {
    language: parsed.language || (isNotSure ? 'Python' : language),
    generatedCode: parsed.generatedCode || '// Solution generated',
    explanation: parsed.explanation || 'Solution generated successfully.',
    expectedOutput: parsed.expectedOutput || 'Output demonstrated in code comments.'
  };
}
