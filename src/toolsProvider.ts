import { ToolsProviderController, tool } from "@lmstudio/sdk";
import { z } from "zod";
import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import path from "path";

/**
 * Get the default quiz output directory
 */
function getDefaultQuizDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
  return path.join(homeDir, "lmstudio-quizzes");
}

/**
 * Extract text from a file
 */
async function extractText(filePath: string): Promise<string> {
  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath).toLowerCase();

  switch (ext) {
    case ".txt":
    case ".md":
    case ".text":
      return readFile(absolutePath, "utf-8");

    case ".pdf": {
      const pdfBuffer = await readFile(absolutePath);
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      return result.text;
    }

    case ".docx": {
      const docxBuffer = await readFile(absolutePath);
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      return result.value;
    }

    default:
      throw new Error(`Unsupported file type: ${ext}. Supported: .txt, .md, .pdf, .docx`);
  }
}

/**
 * Tools Provider for the Quiz Maker Plugin - Simplified Workflow
 */
export async function toolsProvider(ctl: ToolsProviderController) {
  return [
    tool({
      name: "generate_quiz_from_file",
      description: `Generate a complete quiz from a document file (PDF, DOCX, TXT, MD).
This tool extracts text from the file and generates quiz questions using the LLM.
The quiz is saved as a JSON file that can be used with the quiz viewer.

Parameters:
- filePath: Full absolute path to the document file
- questionCount: Total number of questions to generate (default: 10)
- difficulty: Difficulty level - "easy", "medium", or "hard"
- outputDir: Optional directory to store the quiz (default: ~/lmstudio-quizzes)

Returns: Path to the generated quiz JSON file.`,
      parameters: {
        filePath: z.string().describe("Full absolute path to the document file"),
        questionCount: z.number().min(1).max(50).default(10).describe("Total number of questions to generate"),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium").describe("Difficulty level"),
        outputDir: z.string().optional().describe("Output directory for the quiz"),
      },
      implementation: async ({ filePath, questionCount, difficulty, outputDir }) => {
        try {
          const baseDir = outputDir || getDefaultQuizDir();
          await mkdir(baseDir, { recursive: true });

          // Extract text from file
          const content = await extractText(filePath);
          const fileName = path.basename(filePath);
          const baseName = path.basename(fileName, path.extname(fileName));
          const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");

          // Create document directory
          const docDir = path.join(baseDir, safeName);
          await mkdir(docDir, { recursive: true });

          // Truncate content if too long (keep first 15000 chars for context)
          const truncatedContent = content.length > 15000 
            ? content.substring(0, 15000) + "\n\n[Content truncated...]"
            : content;

          // Create the quiz generation prompt
          const difficultyPrompt = {
            easy: "basic recall and comprehension",
            medium: "application and analysis",
            hard: "synthesis, evaluation, and critical thinking",
          }[difficulty];

          const prompt = `You are an expert quiz generator. Based on the following document content, create ${questionCount} multiple-choice questions at ${difficultyPrompt} level.

RULES:
1. Each question must have exactly 4 answer options (A, B, C, D)
2. Only ONE option should be correct
3. Make distractors plausible but clearly incorrect
4. Questions should test understanding, not just recall
5. Output MUST be valid JSON matching the schema below

JSON Schema:
{
  "title": "Descriptive quiz title based on content",
  "questions": [
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
}

DOCUMENT CONTENT:
${truncatedContent}

Output ONLY the JSON, no additional text or markdown formatting.`;

          return {
            success: true,
            fileName,
            baseName: safeName,
            characterCount: content.length,
            contentForQuiz: truncatedContent,
            prompt,
            outputDir: docDir,
            message: `Extracted ${content.length} characters from "${fileName}". Use the prompt above to generate ${questionCount} quiz questions at ${difficulty} difficulty.`,
            instructions: "Please generate the quiz questions as a JSON object with 'title' and 'questions' array. Then call save_quiz to save it.",
          };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message,
          };
        }
      },
    }),

    tool({
      name: "save_quiz",
      description: `Save a generated quiz to a JSON file.
Call this after the LLM has generated quiz questions.

Parameters:
- quizData: The quiz JSON object with title and questions
- documentName: Name of the source document
- outputDir: Optional directory to store the quiz`,
      parameters: {
        quizData: z.object({
          title: z.string(),
          questions: z.array(z.object({
            question: z.string(),
            options: z.array(z.object({ id: z.string(), text: z.string() })),
            correctAnswer: z.string(),
          })),
        }).describe("The quiz data to save"),
        documentName: z.string().describe("Name of the source document"),
        outputDir: z.string().optional().describe("Output directory for the quiz"),
      },
      implementation: async ({ quizData, documentName, outputDir }) => {
        try {
          const baseDir = outputDir || getDefaultQuizDir();
          const docDir = path.join(baseDir, documentName);
          await mkdir(docDir, { recursive: true });

          // Validate and transform questions
          const questions = quizData.questions.map((q, idx) => ({
            id: idx + 1,
            question: q.question,
            options: q.options.slice(0, 4).map((opt, i) => ({
              id: String.fromCharCode(97 + i),
              text: opt.text,
            })),
            correctAnswer: ["a", "b", "c", "d"].includes(q.correctAnswer?.toLowerCase())
              ? q.correctAnswer.toLowerCase()
              : "a",
          }));

          const quiz = {
            title: quizData.title || `Quiz: ${documentName}`,
            sourceDocument: documentName,
            sourceFile: documentName,
            totalQuestions: questions.length,
            questions,
            createdAt: new Date().toISOString(),
          };

          const quizPath = path.join(docDir, "quiz.json");
          await writeFile(quizPath, JSON.stringify(quiz, null, 2));

          return {
            success: true,
            quizPath,
            questionCount: questions.length,
            message: `Quiz saved to ${quizPath}`,
            nextStep: "Call open_quiz_viewer to launch the quiz in the browser.",
          };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message,
          };
        }
      },
    }),

    tool({
      name: "open_quiz_viewer",
      description: `Start the quiz viewer server and open it in the browser.
The quiz viewer allows users to:
- Browse all available quizzes
- Select and take quizzes
- See results and review answers

The server runs on http://localhost:3456

Parameters:
- quizDir: Optional directory containing quizzes (default: ~/lmstudio-quizzes)`,
      parameters: {
        quizDir: z.string().optional().describe("Directory containing quiz files"),
      },
      implementation: async ({ quizDir }) => {
        try {
          const baseDir = quizDir || getDefaultQuizDir();

          // Import and start the server
          const { startQuizServer } = await import("./quiz-server.js");
          await startQuizServer(baseDir);

          return {
            success: true,
            viewerUrl: "http://localhost:3456",
            quizDir: baseDir,
            message: `Quiz viewer is running at http://localhost:3456`,
            instructions: "Open the URL in your browser to select and take quizzes.",
          };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message,
          };
        }
      },
    }),

    tool({
      name: "list_available_quizzes",
      description: `List all available quizzes in the quiz directory.

Parameters:
- quizDir: Optional directory to search for quizzes`,
      parameters: {
        quizDir: z.string().optional().describe("Directory to search for quizzes"),
      },
      implementation: async ({ quizDir }) => {
        try {
          const baseDir = quizDir || getDefaultQuizDir();
          const { listQuizDirectories, loadQuizFromDirectory } = await import("./quiz-generator.js");

          const dirs = await listQuizDirectories(baseDir);
          const quizzes = await Promise.all(
            dirs.map(async (dir) => {
              const quiz = await loadQuizFromDirectory(path.join(baseDir, dir));
              return {
                name: dir,
                path: path.join(baseDir, dir),
                title: quiz?.title || dir,
                questionCount: quiz?.totalQuestions || 0,
                createdAt: quiz?.createdAt,
              };
            })
          );

          return {
            success: true,
            quizDir: baseDir,
            quizCount: quizzes.length,
            quizzes,
          };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message,
          };
        }
      },
    }),
  ];
}
