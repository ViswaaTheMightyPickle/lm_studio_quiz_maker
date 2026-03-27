import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import path from "path";
import { QuizQuestion } from "./quiz-generator.js";

/**
 * Result from preparing quiz generation from chunks
 */
export interface ChunkQuizGenerationResult {
  totalChunks: number;
  instructions: string;
  chunkPrompts: Array<{
    chunkNumber: number;
    chunkFile: string;
    prompt: string;
  }>;
}

/**
 * Prepare quiz generation prompts for all chunks
 * This returns prompts that the LLM should process for each chunk
 */
export async function generateQuizInChunks(
  docDir: string,
  questionsPerChunk: number,
  difficulty: string
): Promise<ChunkQuizGenerationResult> {
  const chunksDir = path.join(docDir, "chunks");
  
  // Read all chunk files
  const chunkFiles = await readdir(chunksDir);
  const sortedChunks = chunkFiles
    .filter(f => f.endsWith(".md"))
    .sort();
  
  if (sortedChunks.length === 0) {
    throw new Error("No chunks found. Process the document first.");
  }
  
  const chunkPrompts: Array<{ chunkNumber: number; chunkFile: string; prompt: string }> = [];
  
  for (let i = 0; i < sortedChunks.length; i++) {
    const chunkFile = sortedChunks[i];
    const chunkPath = path.join(chunksDir, chunkFile);
    const content = await readFile(chunkPath, "utf-8");
    
    // Remove frontmatter
    const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n\n/, "");
    
    const prompt = createChunkQuizPrompt(
      contentWithoutFrontmatter,
      i + 1,
      sortedChunks.length,
      questionsPerChunk,
      difficulty
    );
    
    chunkPrompts.push({
      chunkNumber: i + 1,
      chunkFile,
      prompt,
    });
  }
  
  return {
    totalChunks: sortedChunks.length,
    instructions: `Generate ${questionsPerChunk} quiz questions from each of the ${sortedChunks.length} chunks. 
Process each chunk's content and output a JSON array of questions.
Questions should be at ${difficulty} difficulty level.
Each question must have 4 options (a, b, c, d) with exactly one correct answer.`,
    chunkPrompts,
  };
}

/**
 * Create the prompt for generating quiz questions from a single chunk
 */
function createChunkQuizPrompt(
  content: string,
  chunkNumber: number,
  totalChunks: number,
  questionCount: number,
  difficulty: string
): string {
  const difficultyPrompt = {
    easy: "basic recall and comprehension",
    medium: "application and analysis",
    hard: "synthesis, evaluation, and critical thinking",
  }[difficulty];

  return `You are an expert quiz generator. Based on the following text chunk (${chunkNumber}/${totalChunks}), create ${questionCount} multiple-choice questions at ${difficultyPrompt} level.

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

CONTENT (Chunk ${chunkNumber} of ${totalChunks}):
${content}

Output ONLY the JSON array, no additional text or markdown formatting.`;
}

/**
 * Parse questions from LLM response for a chunk
 */
export function parseQuestionsFromResponse(
  response: string,
  chunkNumber: number,
  startIndex: number
): QuizQuestion[] {
  // Extract JSON from response
  let jsonStr = response.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  
  if (!Array.isArray(parsed)) {
    throw new Error("Response must be a JSON array of questions");
  }
  
  return parsed.map((q: any, idx: number) => ({
    id: startIndex + idx + 1,
    question: q.question,
    options: q.options.slice(0, 4).map((opt: any, i: number) => ({
      id: String.fromCharCode(97 + i),
      text: opt.text,
    })),
    correctAnswer: ["a", "b", "c", "d"].includes(q.correctAnswer?.toLowerCase())
      ? q.correctAnswer.toLowerCase()
      : "a",
    sourceChunk: chunkNumber,
  }));
}

/**
 * Create final quiz from all generated questions
 */
export async function createQuizFromDirectory(
  questions: QuizQuestion[],
  docDir: string,
  documentName: string
): Promise<string> {
  const quiz = {
    title: `Quiz: ${documentName}`,
    sourceDocument: documentName,
    sourceFile: documentName,
    totalQuestions: questions.length,
    questions,
    createdAt: new Date().toISOString(),
  };

  const quizPath = path.join(docDir, "quiz.json");
  await writeFile(quizPath, JSON.stringify(quiz, null, 2));

  return quizPath;
}

/**
 * Read chunk file content
 */
export async function readChunkContent(chunksDir: string, chunkFile: string): Promise<string> {
  const content = await readFile(path.join(chunksDir, chunkFile), "utf-8");
  return content.replace(/^---[\s\S]*?---\n\n/, "");
}
