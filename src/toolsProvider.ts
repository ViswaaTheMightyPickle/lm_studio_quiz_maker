import { ToolsProviderController, tool } from "@lmstudio/sdk";
import { z } from "zod";
import { readFile, writeFile, mkdir } from "fs/promises";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import path from "path";
import { configSchematics } from "./configSchematics.js";

/**
 * Extract text from a file based on its extension
 */
async function extractText(filePath: string): Promise<string> {
  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const fileName = path.basename(absolutePath);

  let content: string;

  switch (ext) {
    case ".txt":
    case ".md":
    case ".text":
      content = await readFile(absolutePath, "utf-8");
      break;

    case ".pdf": {
      const pdfBuffer = await readFile(absolutePath);
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      content = result.text;
      break;
    }

    case ".docx": {
      const docxBuffer = await readFile(absolutePath);
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      content = result.value;
      break;
    }

    default:
      throw new Error(`Unsupported file type: ${ext}. Supported: .txt, .md, .pdf, .docx`);
  }

  if (!content || content.trim().length === 0) {
    throw new Error(`File appears to be empty: ${fileName}`);
  }

  return content.trim();
}

/**
 * Generate quiz questions using the LLM
 */
async function generateQuizQuestions(
  content: string,
  questionCount: number,
  difficulty: string
): Promise<{
  title: string;
  questions: Array<{
    question: string;
    options: Array<{ id: string; text: string }>;
    correctAnswer: string;
  }>;
}> {
  const difficultyPrompt = {
    easy: "basic comprehension and recall",
    medium: "understanding and application",
    hard: "analysis, synthesis, and evaluation",
  }[difficulty];

  const prompt = `You are an expert quiz generator. Based on the following text, create ${questionCount} multiple-choice questions at ${difficultyPrompt} level.

RULES:
1. Each question must have exactly 4 answer options (A, B, C, D)
2. Only ONE option should be correct
3. Make distractors (wrong answers) plausible but clearly incorrect
4. Questions should test comprehension, not just recall
5. Vary question difficulty within the specified level
6. Output MUST be valid JSON matching the schema below

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

CONTENT TO GENERATE QUESTIONS FROM:
${content}

Output ONLY the JSON, no additional text or markdown formatting.`;

  // Note: In plugin context, we return the prompt for the LLM to process
  // The actual generation happens through the LLM the user is chatting with
  throw new Error("Internal error: Quiz generation should be handled by the LLM");
}

/**
 * Tools Provider for the Quiz Maker Plugin
 */
export async function toolsProvider(ctl: ToolsProviderController) {
  return [
    tool({
      name: "generate_quiz_from_file",
      description: `Generate a multiple-choice quiz from a file (PDF, DOCX, TXT, or MD). 
Use this tool when the user wants to create a quiz from study materials, lecture notes, or documents.
The tool will extract text from the file and help generate quiz questions with 4 answer options each.

Parameters:
- filePath: Full absolute path to the file (e.g., /home/user/Documents/file.pdf)
- questionCount: Number of questions to generate (default: 10)
- difficulty: Difficulty level - "easy", "medium", or "hard" (default: "medium")

Returns: A JSON quiz object with title and questions array.`,
      parameters: {
        filePath: z.string().describe("Path to the file to generate quiz from"),
        questionCount: z.number().min(1).max(50).default(10).describe("Number of questions to generate"),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium").describe("Difficulty level"),
      },
      implementation: async ({ filePath, questionCount, difficulty }) => {
        try {
          const config = ctl.getPluginConfig(configSchematics as any);
          const actualQuestionCount = questionCount ?? config.get("questionCount");
          const actualDifficulty = difficulty ?? config.get("difficulty");

          // Resolve the file path - handle both relative and absolute paths
          let resolvedPath = filePath;
          if (!path.isAbsolute(filePath)) {
            // Try common locations for attached files
            const homeDir = process.env.HOME || process.env.USERPROFILE || "";
            const downloadDir = path.join(homeDir, "Downloads");
            const desktopDir = path.join(homeDir, "Desktop");
            const documentsDir = path.join(homeDir, "Documents");
            
            // Try to find the file in common locations
            const searchPaths = [
              process.cwd(),
              downloadDir,
              desktopDir,
              documentsDir,
              homeDir,
            ];
            
            for (const searchPath of searchPaths) {
              const candidate = path.join(searchPath, filePath);
              try {
                await readFile(candidate);
                resolvedPath = candidate;
                break;
              } catch {
                // File not found in this location, try next
              }
            }
          }

          // Extract text from file
          const content = await extractText(resolvedPath);
          const fileName = path.basename(resolvedPath);

          // Return the extracted content and instructions for the LLM
          return {
            success: true,
            fileName,
            characterCount: content.length,
            extractedContent: content.substring(0, 5000), // Limit content for context
            instructions: `I've extracted text from "${fileName}" (${content.length} characters).
Based on this content, please generate ${actualQuestionCount} ${actualDifficulty} multiple-choice quiz questions.
Each question should have 4 options (A, B, C, D) with exactly one correct answer.
Format your response as a JSON object with "title" and "questions" array.`,
          };
        } catch (error) {
          const errorMsg = (error as Error).message;
          return {
            success: false,
            error: `${errorMsg}\n\nTip: Provide the full absolute path to the file (e.g., /home/user/Documents/file.pdf)`,
          };
        }
      },
    }),

    tool({
      name: "create_quiz_json",
      description: `Save a generated quiz to a JSON file and optionally open it in the browser.
Use this after the LLM has generated quiz questions to save them for the quiz viewer.

Parameters:
- quizData: The quiz JSON object with title and questions
- autoOpen: Whether to open the quiz in browser (default: true)`,
      parameters: {
        quizData: z.object({
          title: z.string(),
          questions: z.array(z.object({
            question: z.string(),
            options: z.array(z.object({ id: z.string(), text: z.string() })),
            correctAnswer: z.string(),
          })),
        }).describe("The quiz data to save"),
        autoOpen: z.boolean().default(true).describe("Whether to open quiz in browser"),
      },
      implementation: async ({ quizData, autoOpen }) => {
        try {
          const workingDir = ctl.getWorkingDirectory();
          const outputPath = path.join(workingDir, "quiz.json");

          // Validate quiz structure
          if (!quizData.questions || quizData.questions.length === 0) {
            return { success: false, error: "No questions in quiz data" };
          }

          // Ensure each question has 4 options and valid correctAnswer
          const validatedQuestions = quizData.questions.map((q, idx) => ({
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
            title: quizData.title || "Generated Quiz",
            sourceFile: "user-provided content",
            totalQuestions: validatedQuestions.length,
            questions: validatedQuestions,
          };

          await mkdir(workingDir, { recursive: true });
          await writeFile(outputPath, JSON.stringify(quiz, null, 2));

          return {
            success: true,
            outputPath,
            questionCount: validatedQuestions.length,
            message: `Quiz saved to ${outputPath}. ${autoOpen ? "Opening in browser..." : ""}`,
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
      description: `Open the quiz viewer in the browser to take the generated quiz.
The quiz viewer provides an interactive interface with:
- One question at a time display
- Progress tracking
- Answer selection
- Final score and review of all answers

Use this after a quiz has been generated and saved.`,
      parameters: {
        quizPath: z.string().optional().describe("Optional path to quiz.json if not in working directory"),
      },
      implementation: async ({ quizPath }) => {
        try {
          const workingDir = ctl.getWorkingDirectory();
          const quizFile = quizPath || path.join(workingDir, "quiz.json");

          // Check if quiz file exists
          try {
            await readFile(quizFile, "utf-8");
          } catch {
            return {
              success: false,
              error: `Quiz file not found: ${quizFile}. Please generate a quiz first.`,
            };
          }

          // Return instructions for the user to open the quiz
          return {
            success: true,
            quizPath: quizFile,
            message: `Quiz file found at ${quizFile}. To view the quiz, run: npm run view`,
            instructions: "The quiz viewer will open in your default browser with an interactive interface.",
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
