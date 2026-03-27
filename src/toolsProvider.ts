import { ToolsProviderController, tool } from "@lmstudio/sdk";
import { z } from "zod";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { convertToMarkdown, listProcessedDocuments, readDocumentChunks } from "./document-processor.js";
import { createQuizFromDirectory, generateQuizInChunks } from "./quiz-workflow.js";
import { startQuizServer } from "./quiz-server.js";

let quizServerStarted = false;
let quizBaseDir = "";

/**
 * Get the default quiz output directory
 */
function getDefaultQuizDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
  return path.join(homeDir, "lmstudio-quizzes");
}

/**
 * Tools Provider for the Quiz Maker Plugin
 */
export async function toolsProvider(ctl: ToolsProviderController) {
  return [
    tool({
      name: "process_document_for_quiz",
      description: `Process a document (PDF, DOCX, TXT, MD) for quiz generation.
This converts the file to markdown, chunks it for efficient processing, and prepares it for quiz generation.
Use this as the first step when a user wants to create a quiz from a document.

Parameters:
- filePath: Full absolute path to the document file
- outputDir: Optional directory to store processed files (default: ~/lmstudio-quizzes)

Returns: Information about the processed document including chunk count.`,
      parameters: {
        filePath: z.string().describe("Full absolute path to the document file"),
        outputDir: z.string().optional().describe("Output directory for processed files"),
      },
      implementation: async ({ filePath, outputDir }) => {
        try {
          const baseDir = outputDir || getDefaultQuizDir();
          await mkdir(baseDir, { recursive: true });
          
          const result = await convertToMarkdown(filePath, baseDir);
          
          return {
            success: true,
            fileName: result.fileName,
            baseName: result.baseName,
            markdownPath: result.markdownPath,
            chunksPath: result.chunksPath,
            totalChunks: result.totalChunks,
            message: `Processed "${result.fileName}" into ${result.totalChunks} chunks. Ready for quiz generation.`,
            nextStep: "Call generate_quiz_from_chunks to create quiz questions from the processed chunks.",
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
      name: "generate_quiz_from_chunks",
      description: `Generate quiz questions from processed document chunks.
This uses multiple LLM calls to generate questions from each chunk, avoiding context limits.
Call this after process_document_for_quiz.

Parameters:
- documentName: The base name of the processed document (e.g., "lecture_notes")
- questionsPerChunk: Number of questions to generate per chunk (default: 2-3)
- difficulty: Difficulty level - "easy", "medium", or "hard"
- outputDir: Optional directory where processed files are stored`,
      parameters: {
        documentName: z.string().describe("Base name of the processed document"),
        questionsPerChunk: z.number().min(1).max(10).default(2).describe("Questions per chunk"),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium").describe("Difficulty level"),
        outputDir: z.string().optional().describe("Directory containing processed files"),
      },
      implementation: async ({ documentName, questionsPerChunk, difficulty, outputDir }) => {
        try {
          const baseDir = outputDir || getDefaultQuizDir();
          const docDir = path.join(baseDir, documentName);
          
          // Generate quiz from chunks using multiple LLM calls
          // This returns prompts for each chunk that the LLM should process
          const result = await generateQuizInChunks(docDir, questionsPerChunk, difficulty);
          
          return {
            success: true,
            documentName,
            totalChunks: result.totalChunks,
            questionsToGenerate: result.totalChunks * questionsPerChunk,
            message: `Ready to generate ${result.totalChunks * questionsPerChunk} questions from ${result.totalChunks} chunks.`,
            instructions: result.instructions,
            nextStep: "After the LLM generates questions for each chunk, call finalize_quiz to combine them.",
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
      name: "finalize_quiz",
      description: `Combine generated questions from all chunks into a final quiz JSON file.
Call this after the LLM has generated questions for all chunks.

Parameters:
- documentName: The base name of the processed document
- allQuestions: Array of all generated questions from all chunks
- outputDir: Optional directory to store the final quiz`,
      parameters: {
        documentName: z.string().describe("Base name of the processed document"),
        allQuestions: z.array(z.object({
          question: z.string(),
          options: z.array(z.object({ id: z.string(), text: z.string() })),
          correctAnswer: z.string(),
        })).describe("All generated questions from all chunks"),
        outputDir: z.string().optional().describe("Output directory for the quiz"),
      },
      implementation: async ({ documentName, allQuestions, outputDir }) => {
        try {
          const baseDir = outputDir || getDefaultQuizDir();
          const docDir = path.join(baseDir, documentName);
          
          // Add id to each question
          const questionsWithId = allQuestions.map((q, idx) => ({
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
          
          const quizPath = await createQuizFromDirectory(questionsWithId, docDir, documentName);
          
          return {
            success: true,
            quizPath,
            questionCount: allQuestions.length,
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
- Select from available quizzes
- Take quizzes with a clean interface
- See results and review answers

Parameters:
- quizDir: Optional directory containing quizzes (default: ~/lmstudio-quizzes)`,
      parameters: {
        quizDir: z.string().optional().describe("Directory containing quiz files"),
      },
      implementation: async ({ quizDir }) => {
        try {
          const baseDir = quizDir || getDefaultQuizDir();
          quizBaseDir = baseDir;
          
          // Start the server if not already running
          if (!quizServerStarted) {
            await startQuizServer(baseDir);
            quizServerStarted = true;
          }
          
          return {
            success: true,
            viewerUrl: `http://localhost:3456`,
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
Use this to show the user what quizzes they have already generated.

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
