import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import path from "path";
import { z } from "zod";

export interface QuizQuestion {
  id: number;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  sourceChunk?: number;
}

export interface Quiz {
  title: string;
  sourceDocument: string;
  sourceFile: string;
  totalQuestions: number;
  questions: QuizQuestion[];
  createdAt: string;
}

/**
 * Generate quiz questions from a single chunk of text
 * This is designed to be called multiple times for different chunks
 */
export async function generateQuestionsFromChunk(
  chunkContent: string,
  chunkNumber: number,
  questionCount: number,
  difficulty: string
): Promise<QuizQuestion[]> {
  const difficultyPrompt = {
    easy: "basic recall and comprehension",
    medium: "application and analysis",
    hard: "synthesis, evaluation, and critical thinking",
  }[difficulty];

  const prompt = `You are an expert quiz generator. Based on the following text chunk, create ${questionCount} multiple-choice questions at ${difficultyPrompt} level.

RULES:
1. Each question must have exactly 4 answer options (A, B, C, D)
2. Only ONE option should be correct
3. Make distractors plausible but clearly incorrect
4. Questions should test understanding, not just recall
5. Output MUST be valid JSON array

JSON Schema (array of questions):
[
  {
    "question": "Question text here?",
    "options": [
      {"id": "a", "text": "Option A text"},
      {"id": "b", "text": "Option B text"},
      {"id": "c", "text": "Option C text"},
      {"id": "d", "text": "Option D text"}
    ],
    "correctAnswer": "a"
  }
]

CONTENT (Chunk ${chunkNumber}):
${chunkContent}

Output ONLY the JSON array, no additional text or markdown formatting.`;

  // Return the prompt for the LLM to process
  // The actual generation happens through the LLM
  throw new Error("This function generates prompts for LLM processing");
}

/**
 * Schema for validating generated questions
 */
const questionSchema = z.array(z.object({
  question: z.string(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
  })),
  correctAnswer: z.string(),
}));

/**
 * Parse and validate questions from LLM response
 */
export function parseQuestionsFromResponse(
  response: string,
  chunkNumber: number,
  startIndex: number
): QuizQuestion[] {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = response.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = questionSchema.parse(JSON.parse(jsonStr));
    
    return parsed.map((q, idx) => ({
      id: startIndex + idx + 1,
      question: q.question,
      options: q.options.slice(0, 4).map((opt, i) => ({
        id: String.fromCharCode(97 + i),
        text: opt.text,
      })),
      correctAnswer: ["a", "b", "c", "d"].includes(q.correctAnswer?.toLowerCase())
        ? q.correctAnswer.toLowerCase()
        : "a",
      sourceChunk: chunkNumber,
    }));
  } catch (error) {
    console.error("Failed to parse questions from response:", error);
    throw new Error(`Failed to parse questions from chunk ${chunkNumber}`);
  }
}

/**
 * Combine questions from multiple chunks into a final quiz
 */
export async function createQuizFromQuestions(
  questions: QuizQuestion[],
  sourceDocument: string,
  sourceFile: string,
  outputDir: string
): Promise<string> {
  const quiz: Quiz = {
    title: `Quiz: ${sourceDocument}`,
    sourceDocument,
    sourceFile,
    totalQuestions: questions.length,
    questions,
    createdAt: new Date().toISOString(),
  };

  const outputPath = path.join(outputDir, "quiz.json");
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(quiz, null, 2));

  return outputPath;
}

/**
 * Generate a summary of a document for quiz title and context
 */
export function generateDocumentSummaryPrompt(content: string): string {
  return `Analyze the following document content and provide:
1. A concise, descriptive title for a quiz based on this content
2. A brief summary (2-3 sentences) of the main topics covered

CONTENT:
${content.substring(0, 3000)}

Respond in JSON format:
{
  "title": "Descriptive Quiz Title",
  "summary": "Brief summary of content"
}`;
}

/**
 * Load existing quiz from a directory
 */
export async function loadQuizFromDirectory(dirPath: string): Promise<Quiz | null> {
  try {
    const quizPath = path.join(dirPath, "quiz.json");
    const content = await readFile(quizPath, "utf-8");
    return JSON.parse(content) as Quiz;
  } catch {
    return null;
  }
}

/**
 * List all quiz directories in a base directory
 */
export async function listQuizDirectories(baseDir: string): Promise<string[]> {
  const quizzes: string[] = [];
  
  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const quizPath = path.join(baseDir, entry.name, "quiz.json");
      try {
        await readFile(quizPath, "utf-8");
        quizzes.push(entry.name);
      } catch {
        // No quiz.json in this directory
      }
    }
  } catch {
    // Directory doesn't exist
  }
  
  return quizzes;
}
