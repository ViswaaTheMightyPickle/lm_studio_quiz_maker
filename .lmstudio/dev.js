"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/configSchematics.ts
var import_sdk, configSchematics;
var init_configSchematics = __esm({
  "src/configSchematics.ts"() {
    "use strict";
    import_sdk = require("@lmstudio/sdk");
    configSchematics = (0, import_sdk.createConfigSchematics)().field("questionCount", "numeric", {
      displayName: "Number of Questions",
      hint: "How many quiz questions to generate from the content",
      min: 1,
      max: 50,
      int: true
    }, 10).field("difficulty", "select", {
      displayName: "Difficulty Level",
      hint: "Difficulty level of generated questions",
      options: [
        { value: "easy", displayName: "Easy" },
        { value: "medium", displayName: "Medium" },
        { value: "hard", displayName: "Hard" }
      ]
    }, "medium").field("autoOpenQuiz", "boolean", {
      displayName: "Auto-open Quiz",
      hint: "Automatically open the quiz in browser after generation"
    }, true).build();
  }
});

// src/toolsProvider.ts
async function extractText(filePath) {
  const absolutePath = import_path.default.resolve(filePath);
  const ext = import_path.default.extname(absolutePath).toLowerCase();
  const fileName = import_path.default.basename(absolutePath);
  let content;
  switch (ext) {
    case ".txt":
    case ".md":
    case ".text":
      content = await (0, import_promises.readFile)(absolutePath, "utf-8");
      break;
    case ".pdf": {
      const pdfBuffer = await (0, import_promises.readFile)(absolutePath);
      const parser = new import_pdf_parse.PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      content = result.text;
      break;
    }
    case ".docx": {
      const docxBuffer = await (0, import_promises.readFile)(absolutePath);
      const result = await import_mammoth.default.extractRawText({ buffer: docxBuffer });
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
async function toolsProvider(ctl) {
  return [
    (0, import_sdk2.tool)({
      name: "generate_quiz_from_file",
      description: `Generate a multiple-choice quiz from an attached file (PDF, DOCX, TXT, or MD). 
Use this tool when the user wants to create a quiz from study materials, lecture notes, or documents.
The tool will extract text from the file and help generate quiz questions with 4 answer options each.

Parameters:
- filePath: Path to the file to process
- questionCount: Number of questions to generate (default: 10)
- difficulty: Difficulty level - "easy", "medium", or "hard" (default: "medium")

Returns: A JSON quiz object with title and questions array.`,
      parameters: {
        filePath: import_zod.z.string().describe("Path to the file to generate quiz from"),
        questionCount: import_zod.z.number().min(1).max(50).default(10).describe("Number of questions to generate"),
        difficulty: import_zod.z.enum(["easy", "medium", "hard"]).default("medium").describe("Difficulty level")
      },
      implementation: async ({ filePath, questionCount, difficulty }) => {
        try {
          const config = ctl.getPluginConfig(configSchematics);
          const actualQuestionCount = questionCount ?? config.get("questionCount");
          const actualDifficulty = difficulty ?? config.get("difficulty");
          const content = await extractText(filePath);
          const fileName = import_path.default.basename(filePath);
          return {
            success: true,
            fileName,
            characterCount: content.length,
            extractedContent: content.substring(0, 5e3),
            // Limit content for context
            instructions: `I've extracted text from "${fileName}" (${content.length} characters). 
Based on this content, please generate ${actualQuestionCount} ${actualDifficulty} multiple-choice quiz questions.
Each question should have 4 options (A, B, C, D) with exactly one correct answer.
Format your response as a JSON object with "title" and "questions" array.`
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    }),
    (0, import_sdk2.tool)({
      name: "create_quiz_json",
      description: `Save a generated quiz to a JSON file and optionally open it in the browser.
Use this after the LLM has generated quiz questions to save them for the quiz viewer.

Parameters:
- quizData: The quiz JSON object with title and questions
- autoOpen: Whether to open the quiz in browser (default: true)`,
      parameters: {
        quizData: import_zod.z.object({
          title: import_zod.z.string(),
          questions: import_zod.z.array(import_zod.z.object({
            question: import_zod.z.string(),
            options: import_zod.z.array(import_zod.z.object({ id: import_zod.z.string(), text: import_zod.z.string() })),
            correctAnswer: import_zod.z.string()
          }))
        }).describe("The quiz data to save"),
        autoOpen: import_zod.z.boolean().default(true).describe("Whether to open quiz in browser")
      },
      implementation: async ({ quizData, autoOpen }) => {
        try {
          const workingDir = ctl.getWorkingDirectory();
          const outputPath = import_path.default.join(workingDir, "quiz.json");
          if (!quizData.questions || quizData.questions.length === 0) {
            return { success: false, error: "No questions in quiz data" };
          }
          const validatedQuestions = quizData.questions.map((q, idx) => ({
            id: idx + 1,
            question: q.question,
            options: q.options.slice(0, 4).map((opt, i) => ({
              id: String.fromCharCode(97 + i),
              text: opt.text
            })),
            correctAnswer: ["a", "b", "c", "d"].includes(q.correctAnswer?.toLowerCase()) ? q.correctAnswer.toLowerCase() : "a"
          }));
          const quiz = {
            title: quizData.title || "Generated Quiz",
            sourceFile: "user-provided content",
            totalQuestions: validatedQuestions.length,
            questions: validatedQuestions
          };
          await (0, import_promises.mkdir)(workingDir, { recursive: true });
          await (0, import_promises.writeFile)(outputPath, JSON.stringify(quiz, null, 2));
          return {
            success: true,
            outputPath,
            questionCount: validatedQuestions.length,
            message: `Quiz saved to ${outputPath}. ${autoOpen ? "Opening in browser..." : ""}`
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    }),
    (0, import_sdk2.tool)({
      name: "open_quiz_viewer",
      description: `Open the quiz viewer in the browser to take the generated quiz.
The quiz viewer provides an interactive interface with:
- One question at a time display
- Progress tracking
- Answer selection
- Final score and review of all answers

Use this after a quiz has been generated and saved.`,
      parameters: {
        quizPath: import_zod.z.string().optional().describe("Optional path to quiz.json if not in working directory")
      },
      implementation: async ({ quizPath }) => {
        try {
          const workingDir = ctl.getWorkingDirectory();
          const quizFile = quizPath || import_path.default.join(workingDir, "quiz.json");
          try {
            await (0, import_promises.readFile)(quizFile, "utf-8");
          } catch {
            return {
              success: false,
              error: `Quiz file not found: ${quizFile}. Please generate a quiz first.`
            };
          }
          return {
            success: true,
            quizPath: quizFile,
            message: `Quiz file found at ${quizFile}. To view the quiz, run: npm run view`,
            instructions: "The quiz viewer will open in your default browser with an interactive interface."
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    })
  ];
}
var import_sdk2, import_zod, import_promises, import_pdf_parse, import_mammoth, import_path;
var init_toolsProvider = __esm({
  "src/toolsProvider.ts"() {
    "use strict";
    import_sdk2 = require("@lmstudio/sdk");
    import_zod = require("zod");
    import_promises = require("fs/promises");
    import_pdf_parse = require("pdf-parse");
    import_mammoth = __toESM(require("mammoth"));
    import_path = __toESM(require("path"));
    init_configSchematics();
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  main: () => main
});
async function main(context) {
  context.withConfigSchematics(configSchematics);
  context.withToolsProvider(toolsProvider);
}
var init_src = __esm({
  "src/index.ts"() {
    "use strict";
    init_configSchematics();
    init_toolsProvider();
  }
});

// .lmstudio/entry.ts
var import_sdk3 = require("@lmstudio/sdk");
var clientIdentifier = process.env.LMS_PLUGIN_CLIENT_IDENTIFIER;
var clientPasskey = process.env.LMS_PLUGIN_CLIENT_PASSKEY;
var baseUrl = process.env.LMS_PLUGIN_BASE_URL;
var client = new import_sdk3.LMStudioClient({
  clientIdentifier,
  clientPasskey,
  baseUrl
});
globalThis.__LMS_PLUGIN_CONTEXT = true;
var predictionLoopHandlerSet = false;
var promptPreprocessorSet = false;
var configSchematicsSet = false;
var globalConfigSchematicsSet = false;
var toolsProviderSet = false;
var generatorSet = false;
var selfRegistrationHost = client.plugins.getSelfRegistrationHost();
var pluginContext = {
  withPredictionLoopHandler: (generate) => {
    if (predictionLoopHandlerSet) {
      throw new Error("PredictionLoopHandler already registered");
    }
    if (toolsProviderSet) {
      throw new Error("PredictionLoopHandler cannot be used with a tools provider");
    }
    predictionLoopHandlerSet = true;
    selfRegistrationHost.setPredictionLoopHandler(generate);
    return pluginContext;
  },
  withPromptPreprocessor: (preprocess) => {
    if (promptPreprocessorSet) {
      throw new Error("PromptPreprocessor already registered");
    }
    promptPreprocessorSet = true;
    selfRegistrationHost.setPromptPreprocessor(preprocess);
    return pluginContext;
  },
  withConfigSchematics: (configSchematics2) => {
    if (configSchematicsSet) {
      throw new Error("Config schematics already registered");
    }
    configSchematicsSet = true;
    selfRegistrationHost.setConfigSchematics(configSchematics2);
    return pluginContext;
  },
  withGlobalConfigSchematics: (globalConfigSchematics) => {
    if (globalConfigSchematicsSet) {
      throw new Error("Global config schematics already registered");
    }
    globalConfigSchematicsSet = true;
    selfRegistrationHost.setGlobalConfigSchematics(globalConfigSchematics);
    return pluginContext;
  },
  withToolsProvider: (toolsProvider2) => {
    if (toolsProviderSet) {
      throw new Error("Tools provider already registered");
    }
    if (predictionLoopHandlerSet) {
      throw new Error("Tools provider cannot be used with a predictionLoopHandler");
    }
    toolsProviderSet = true;
    selfRegistrationHost.setToolsProvider(toolsProvider2);
    return pluginContext;
  },
  withGenerator: (generator) => {
    if (generatorSet) {
      throw new Error("Generator already registered");
    }
    generatorSet = true;
    selfRegistrationHost.setGenerator(generator);
    return pluginContext;
  }
};
Promise.resolve().then(() => (init_src(), src_exports)).then(async (module2) => {
  return await module2.main(pluginContext);
}).then(() => {
  selfRegistrationHost.initCompleted();
}).catch((error) => {
  console.error("Failed to execute the main function of the plugin.");
  console.error(error);
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NvbmZpZ1NjaGVtYXRpY3MudHMiLCAiLi4vc3JjL3Rvb2xzUHJvdmlkZXIudHMiLCAiLi4vc3JjL2luZGV4LnRzIiwgImVudHJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBjcmVhdGVDb25maWdTY2hlbWF0aWNzIH0gZnJvbSBcIkBsbXN0dWRpby9zZGtcIjtcblxuLyoqXG4gKiBQbHVnaW4gY29uZmlndXJhdGlvbiBvcHRpb25zXG4gKi9cbmV4cG9ydCBjb25zdCBjb25maWdTY2hlbWF0aWNzID0gY3JlYXRlQ29uZmlnU2NoZW1hdGljcygpXG4gIC5maWVsZChcInF1ZXN0aW9uQ291bnRcIiwgXCJudW1lcmljXCIsIHtcbiAgICBkaXNwbGF5TmFtZTogXCJOdW1iZXIgb2YgUXVlc3Rpb25zXCIsXG4gICAgaGludDogXCJIb3cgbWFueSBxdWl6IHF1ZXN0aW9ucyB0byBnZW5lcmF0ZSBmcm9tIHRoZSBjb250ZW50XCIsXG4gICAgbWluOiAxLFxuICAgIG1heDogNTAsXG4gICAgaW50OiB0cnVlLFxuICB9LCAxMClcbiAgLmZpZWxkKFwiZGlmZmljdWx0eVwiLCBcInNlbGVjdFwiLCB7XG4gICAgZGlzcGxheU5hbWU6IFwiRGlmZmljdWx0eSBMZXZlbFwiLFxuICAgIGhpbnQ6IFwiRGlmZmljdWx0eSBsZXZlbCBvZiBnZW5lcmF0ZWQgcXVlc3Rpb25zXCIsXG4gICAgb3B0aW9uczogW1xuICAgICAgeyB2YWx1ZTogXCJlYXN5XCIsIGRpc3BsYXlOYW1lOiBcIkVhc3lcIiB9LFxuICAgICAgeyB2YWx1ZTogXCJtZWRpdW1cIiwgZGlzcGxheU5hbWU6IFwiTWVkaXVtXCIgfSxcbiAgICAgIHsgdmFsdWU6IFwiaGFyZFwiLCBkaXNwbGF5TmFtZTogXCJIYXJkXCIgfSxcbiAgICBdLFxuICB9LCBcIm1lZGl1bVwiKVxuICAuZmllbGQoXCJhdXRvT3BlblF1aXpcIiwgXCJib29sZWFuXCIsIHtcbiAgICBkaXNwbGF5TmFtZTogXCJBdXRvLW9wZW4gUXVpelwiLFxuICAgIGhpbnQ6IFwiQXV0b21hdGljYWxseSBvcGVuIHRoZSBxdWl6IGluIGJyb3dzZXIgYWZ0ZXIgZ2VuZXJhdGlvblwiLFxuICB9LCB0cnVlKVxuICAuYnVpbGQoKTtcbiIsICJpbXBvcnQgeyBUb29sc1Byb3ZpZGVyQ29udHJvbGxlciwgdG9vbCB9IGZyb20gXCJAbG1zdHVkaW8vc2RrXCI7XG5pbXBvcnQgeyB6IH0gZnJvbSBcInpvZFwiO1xuaW1wb3J0IHsgcmVhZEZpbGUsIHdyaXRlRmlsZSwgbWtkaXIgfSBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCB7IFBERlBhcnNlIH0gZnJvbSBcInBkZi1wYXJzZVwiO1xuaW1wb3J0IG1hbW1vdGggZnJvbSBcIm1hbW1vdGhcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb25maWdTY2hlbWF0aWNzIH0gZnJvbSBcIi4vY29uZmlnU2NoZW1hdGljcy5qc1wiO1xuXG4vKipcbiAqIEV4dHJhY3QgdGV4dCBmcm9tIGEgZmlsZSBiYXNlZCBvbiBpdHMgZXh0ZW5zaW9uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGV4dHJhY3RUZXh0KGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBhYnNvbHV0ZVBhdGggPSBwYXRoLnJlc29sdmUoZmlsZVBhdGgpO1xuICBjb25zdCBleHQgPSBwYXRoLmV4dG5hbWUoYWJzb2x1dGVQYXRoKS50b0xvd2VyQ2FzZSgpO1xuICBjb25zdCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoYWJzb2x1dGVQYXRoKTtcblxuICBsZXQgY29udGVudDogc3RyaW5nO1xuXG4gIHN3aXRjaCAoZXh0KSB7XG4gICAgY2FzZSBcIi50eHRcIjpcbiAgICBjYXNlIFwiLm1kXCI6XG4gICAgY2FzZSBcIi50ZXh0XCI6XG4gICAgICBjb250ZW50ID0gYXdhaXQgcmVhZEZpbGUoYWJzb2x1dGVQYXRoLCBcInV0Zi04XCIpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiLnBkZlwiOiB7XG4gICAgICBjb25zdCBwZGZCdWZmZXIgPSBhd2FpdCByZWFkRmlsZShhYnNvbHV0ZVBhdGgpO1xuICAgICAgY29uc3QgcGFyc2VyID0gbmV3IFBERlBhcnNlKHsgZGF0YTogcGRmQnVmZmVyIH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcGFyc2VyLmdldFRleHQoKTtcbiAgICAgIGNvbnRlbnQgPSByZXN1bHQudGV4dDtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNhc2UgXCIuZG9jeFwiOiB7XG4gICAgICBjb25zdCBkb2N4QnVmZmVyID0gYXdhaXQgcmVhZEZpbGUoYWJzb2x1dGVQYXRoKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG1hbW1vdGguZXh0cmFjdFJhd1RleHQoeyBidWZmZXI6IGRvY3hCdWZmZXIgfSk7XG4gICAgICBjb250ZW50ID0gcmVzdWx0LnZhbHVlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgZmlsZSB0eXBlOiAke2V4dH0uIFN1cHBvcnRlZDogLnR4dCwgLm1kLCAucGRmLCAuZG9jeGApO1xuICB9XG5cbiAgaWYgKCFjb250ZW50IHx8IGNvbnRlbnQudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRmlsZSBhcHBlYXJzIHRvIGJlIGVtcHR5OiAke2ZpbGVOYW1lfWApO1xuICB9XG5cbiAgcmV0dXJuIGNvbnRlbnQudHJpbSgpO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIHF1aXogcXVlc3Rpb25zIHVzaW5nIHRoZSBMTE1cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVRdWl6UXVlc3Rpb25zKFxuICBjb250ZW50OiBzdHJpbmcsXG4gIHF1ZXN0aW9uQ291bnQ6IG51bWJlcixcbiAgZGlmZmljdWx0eTogc3RyaW5nXG4pOiBQcm9taXNlPHtcbiAgdGl0bGU6IHN0cmluZztcbiAgcXVlc3Rpb25zOiBBcnJheTx7XG4gICAgcXVlc3Rpb246IHN0cmluZztcbiAgICBvcHRpb25zOiBBcnJheTx7IGlkOiBzdHJpbmc7IHRleHQ6IHN0cmluZyB9PjtcbiAgICBjb3JyZWN0QW5zd2VyOiBzdHJpbmc7XG4gIH0+O1xufT4ge1xuICBjb25zdCBkaWZmaWN1bHR5UHJvbXB0ID0ge1xuICAgIGVhc3k6IFwiYmFzaWMgY29tcHJlaGVuc2lvbiBhbmQgcmVjYWxsXCIsXG4gICAgbWVkaXVtOiBcInVuZGVyc3RhbmRpbmcgYW5kIGFwcGxpY2F0aW9uXCIsXG4gICAgaGFyZDogXCJhbmFseXNpcywgc3ludGhlc2lzLCBhbmQgZXZhbHVhdGlvblwiLFxuICB9W2RpZmZpY3VsdHldO1xuXG4gIGNvbnN0IHByb21wdCA9IGBZb3UgYXJlIGFuIGV4cGVydCBxdWl6IGdlbmVyYXRvci4gQmFzZWQgb24gdGhlIGZvbGxvd2luZyB0ZXh0LCBjcmVhdGUgJHtxdWVzdGlvbkNvdW50fSBtdWx0aXBsZS1jaG9pY2UgcXVlc3Rpb25zIGF0ICR7ZGlmZmljdWx0eVByb21wdH0gbGV2ZWwuXG5cblJVTEVTOlxuMS4gRWFjaCBxdWVzdGlvbiBtdXN0IGhhdmUgZXhhY3RseSA0IGFuc3dlciBvcHRpb25zIChBLCBCLCBDLCBEKVxuMi4gT25seSBPTkUgb3B0aW9uIHNob3VsZCBiZSBjb3JyZWN0XG4zLiBNYWtlIGRpc3RyYWN0b3JzICh3cm9uZyBhbnN3ZXJzKSBwbGF1c2libGUgYnV0IGNsZWFybHkgaW5jb3JyZWN0XG40LiBRdWVzdGlvbnMgc2hvdWxkIHRlc3QgY29tcHJlaGVuc2lvbiwgbm90IGp1c3QgcmVjYWxsXG41LiBWYXJ5IHF1ZXN0aW9uIGRpZmZpY3VsdHkgd2l0aGluIHRoZSBzcGVjaWZpZWQgbGV2ZWxcbjYuIE91dHB1dCBNVVNUIGJlIHZhbGlkIEpTT04gbWF0Y2hpbmcgdGhlIHNjaGVtYSBiZWxvd1xuXG5KU09OIFNjaGVtYTpcbntcbiAgXCJ0aXRsZVwiOiBcIkRlc2NyaXB0aXZlIHF1aXogdGl0bGUgYmFzZWQgb24gY29udGVudFwiLFxuICBcInF1ZXN0aW9uc1wiOiBbXG4gICAge1xuICAgICAgXCJxdWVzdGlvblwiOiBcIlF1ZXN0aW9uIHRleHQgaGVyZT9cIixcbiAgICAgIFwib3B0aW9uc1wiOiBbXG4gICAgICAgIHtcImlkXCI6IFwiYVwiLCBcInRleHRcIjogXCJPcHRpb24gQSB0ZXh0XCJ9LFxuICAgICAgICB7XCJpZFwiOiBcImJcIiwgXCJ0ZXh0XCI6IFwiT3B0aW9uIEIgdGV4dFwifSxcbiAgICAgICAge1wiaWRcIjogXCJjXCIsIFwidGV4dFwiOiBcIk9wdGlvbiBDIHRleHRcIn0sXG4gICAgICAgIHtcImlkXCI6IFwiZFwiLCBcInRleHRcIjogXCJPcHRpb24gRCB0ZXh0XCJ9XG4gICAgICBdLFxuICAgICAgXCJjb3JyZWN0QW5zd2VyXCI6IFwiYVwiXG4gICAgfVxuICBdXG59XG5cbkNPTlRFTlQgVE8gR0VORVJBVEUgUVVFU1RJT05TIEZST006XG4ke2NvbnRlbnR9XG5cbk91dHB1dCBPTkxZIHRoZSBKU09OLCBubyBhZGRpdGlvbmFsIHRleHQgb3IgbWFya2Rvd24gZm9ybWF0dGluZy5gO1xuXG4gIC8vIE5vdGU6IEluIHBsdWdpbiBjb250ZXh0LCB3ZSByZXR1cm4gdGhlIHByb21wdCBmb3IgdGhlIExMTSB0byBwcm9jZXNzXG4gIC8vIFRoZSBhY3R1YWwgZ2VuZXJhdGlvbiBoYXBwZW5zIHRocm91Z2ggdGhlIExMTSB0aGUgdXNlciBpcyBjaGF0dGluZyB3aXRoXG4gIHRocm93IG5ldyBFcnJvcihcIkludGVybmFsIGVycm9yOiBRdWl6IGdlbmVyYXRpb24gc2hvdWxkIGJlIGhhbmRsZWQgYnkgdGhlIExMTVwiKTtcbn1cblxuLyoqXG4gKiBUb29scyBQcm92aWRlciBmb3IgdGhlIFF1aXogTWFrZXIgUGx1Z2luXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0b29sc1Byb3ZpZGVyKGN0bDogVG9vbHNQcm92aWRlckNvbnRyb2xsZXIpIHtcbiAgcmV0dXJuIFtcbiAgICB0b29sKHtcbiAgICAgIG5hbWU6IFwiZ2VuZXJhdGVfcXVpel9mcm9tX2ZpbGVcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBgR2VuZXJhdGUgYSBtdWx0aXBsZS1jaG9pY2UgcXVpeiBmcm9tIGFuIGF0dGFjaGVkIGZpbGUgKFBERiwgRE9DWCwgVFhULCBvciBNRCkuIFxuVXNlIHRoaXMgdG9vbCB3aGVuIHRoZSB1c2VyIHdhbnRzIHRvIGNyZWF0ZSBhIHF1aXogZnJvbSBzdHVkeSBtYXRlcmlhbHMsIGxlY3R1cmUgbm90ZXMsIG9yIGRvY3VtZW50cy5cblRoZSB0b29sIHdpbGwgZXh0cmFjdCB0ZXh0IGZyb20gdGhlIGZpbGUgYW5kIGhlbHAgZ2VuZXJhdGUgcXVpeiBxdWVzdGlvbnMgd2l0aCA0IGFuc3dlciBvcHRpb25zIGVhY2guXG5cblBhcmFtZXRlcnM6XG4tIGZpbGVQYXRoOiBQYXRoIHRvIHRoZSBmaWxlIHRvIHByb2Nlc3Ncbi0gcXVlc3Rpb25Db3VudDogTnVtYmVyIG9mIHF1ZXN0aW9ucyB0byBnZW5lcmF0ZSAoZGVmYXVsdDogMTApXG4tIGRpZmZpY3VsdHk6IERpZmZpY3VsdHkgbGV2ZWwgLSBcImVhc3lcIiwgXCJtZWRpdW1cIiwgb3IgXCJoYXJkXCIgKGRlZmF1bHQ6IFwibWVkaXVtXCIpXG5cblJldHVybnM6IEEgSlNPTiBxdWl6IG9iamVjdCB3aXRoIHRpdGxlIGFuZCBxdWVzdGlvbnMgYXJyYXkuYCxcbiAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgZmlsZVBhdGg6IHouc3RyaW5nKCkuZGVzY3JpYmUoXCJQYXRoIHRvIHRoZSBmaWxlIHRvIGdlbmVyYXRlIHF1aXogZnJvbVwiKSxcbiAgICAgICAgcXVlc3Rpb25Db3VudDogei5udW1iZXIoKS5taW4oMSkubWF4KDUwKS5kZWZhdWx0KDEwKS5kZXNjcmliZShcIk51bWJlciBvZiBxdWVzdGlvbnMgdG8gZ2VuZXJhdGVcIiksXG4gICAgICAgIGRpZmZpY3VsdHk6IHouZW51bShbXCJlYXN5XCIsIFwibWVkaXVtXCIsIFwiaGFyZFwiXSkuZGVmYXVsdChcIm1lZGl1bVwiKS5kZXNjcmliZShcIkRpZmZpY3VsdHkgbGV2ZWxcIiksXG4gICAgICB9LFxuICAgICAgaW1wbGVtZW50YXRpb246IGFzeW5jICh7IGZpbGVQYXRoLCBxdWVzdGlvbkNvdW50LCBkaWZmaWN1bHR5IH0pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBjb25maWcgPSBjdGwuZ2V0UGx1Z2luQ29uZmlnKGNvbmZpZ1NjaGVtYXRpY3MgYXMgYW55KTtcbiAgICAgICAgICBjb25zdCBhY3R1YWxRdWVzdGlvbkNvdW50ID0gcXVlc3Rpb25Db3VudCA/PyBjb25maWcuZ2V0KFwicXVlc3Rpb25Db3VudFwiKTtcbiAgICAgICAgICBjb25zdCBhY3R1YWxEaWZmaWN1bHR5ID0gZGlmZmljdWx0eSA/PyBjb25maWcuZ2V0KFwiZGlmZmljdWx0eVwiKTtcblxuICAgICAgICAgIC8vIEV4dHJhY3QgdGV4dCBmcm9tIGZpbGVcbiAgICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgZXh0cmFjdFRleHQoZmlsZVBhdGgpO1xuICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlUGF0aCk7XG5cbiAgICAgICAgICAvLyBSZXR1cm4gdGhlIGV4dHJhY3RlZCBjb250ZW50IGFuZCBpbnN0cnVjdGlvbnMgZm9yIHRoZSBMTE1cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGZpbGVOYW1lLFxuICAgICAgICAgICAgY2hhcmFjdGVyQ291bnQ6IGNvbnRlbnQubGVuZ3RoLFxuICAgICAgICAgICAgZXh0cmFjdGVkQ29udGVudDogY29udGVudC5zdWJzdHJpbmcoMCwgNTAwMCksIC8vIExpbWl0IGNvbnRlbnQgZm9yIGNvbnRleHRcbiAgICAgICAgICAgIGluc3RydWN0aW9uczogYEkndmUgZXh0cmFjdGVkIHRleHQgZnJvbSBcIiR7ZmlsZU5hbWV9XCIgKCR7Y29udGVudC5sZW5ndGh9IGNoYXJhY3RlcnMpLiBcbkJhc2VkIG9uIHRoaXMgY29udGVudCwgcGxlYXNlIGdlbmVyYXRlICR7YWN0dWFsUXVlc3Rpb25Db3VudH0gJHthY3R1YWxEaWZmaWN1bHR5fSBtdWx0aXBsZS1jaG9pY2UgcXVpeiBxdWVzdGlvbnMuXG5FYWNoIHF1ZXN0aW9uIHNob3VsZCBoYXZlIDQgb3B0aW9ucyAoQSwgQiwgQywgRCkgd2l0aCBleGFjdGx5IG9uZSBjb3JyZWN0IGFuc3dlci5cbkZvcm1hdCB5b3VyIHJlc3BvbnNlIGFzIGEgSlNPTiBvYmplY3Qgd2l0aCBcInRpdGxlXCIgYW5kIFwicXVlc3Rpb25zXCIgYXJyYXkuYCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UsXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KSxcblxuICAgIHRvb2woe1xuICAgICAgbmFtZTogXCJjcmVhdGVfcXVpel9qc29uXCIsXG4gICAgICBkZXNjcmlwdGlvbjogYFNhdmUgYSBnZW5lcmF0ZWQgcXVpeiB0byBhIEpTT04gZmlsZSBhbmQgb3B0aW9uYWxseSBvcGVuIGl0IGluIHRoZSBicm93c2VyLlxuVXNlIHRoaXMgYWZ0ZXIgdGhlIExMTSBoYXMgZ2VuZXJhdGVkIHF1aXogcXVlc3Rpb25zIHRvIHNhdmUgdGhlbSBmb3IgdGhlIHF1aXogdmlld2VyLlxuXG5QYXJhbWV0ZXJzOlxuLSBxdWl6RGF0YTogVGhlIHF1aXogSlNPTiBvYmplY3Qgd2l0aCB0aXRsZSBhbmQgcXVlc3Rpb25zXG4tIGF1dG9PcGVuOiBXaGV0aGVyIHRvIG9wZW4gdGhlIHF1aXogaW4gYnJvd3NlciAoZGVmYXVsdDogdHJ1ZSlgLFxuICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICBxdWl6RGF0YTogei5vYmplY3Qoe1xuICAgICAgICAgIHRpdGxlOiB6LnN0cmluZygpLFxuICAgICAgICAgIHF1ZXN0aW9uczogei5hcnJheSh6Lm9iamVjdCh7XG4gICAgICAgICAgICBxdWVzdGlvbjogei5zdHJpbmcoKSxcbiAgICAgICAgICAgIG9wdGlvbnM6IHouYXJyYXkoei5vYmplY3QoeyBpZDogei5zdHJpbmcoKSwgdGV4dDogei5zdHJpbmcoKSB9KSksXG4gICAgICAgICAgICBjb3JyZWN0QW5zd2VyOiB6LnN0cmluZygpLFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgfSkuZGVzY3JpYmUoXCJUaGUgcXVpeiBkYXRhIHRvIHNhdmVcIiksXG4gICAgICAgIGF1dG9PcGVuOiB6LmJvb2xlYW4oKS5kZWZhdWx0KHRydWUpLmRlc2NyaWJlKFwiV2hldGhlciB0byBvcGVuIHF1aXogaW4gYnJvd3NlclwiKSxcbiAgICAgIH0sXG4gICAgICBpbXBsZW1lbnRhdGlvbjogYXN5bmMgKHsgcXVpekRhdGEsIGF1dG9PcGVuIH0pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCB3b3JraW5nRGlyID0gY3RsLmdldFdvcmtpbmdEaXJlY3RvcnkoKTtcbiAgICAgICAgICBjb25zdCBvdXRwdXRQYXRoID0gcGF0aC5qb2luKHdvcmtpbmdEaXIsIFwicXVpei5qc29uXCIpO1xuXG4gICAgICAgICAgLy8gVmFsaWRhdGUgcXVpeiBzdHJ1Y3R1cmVcbiAgICAgICAgICBpZiAoIXF1aXpEYXRhLnF1ZXN0aW9ucyB8fCBxdWl6RGF0YS5xdWVzdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiTm8gcXVlc3Rpb25zIGluIHF1aXogZGF0YVwiIH07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gRW5zdXJlIGVhY2ggcXVlc3Rpb24gaGFzIDQgb3B0aW9ucyBhbmQgdmFsaWQgY29ycmVjdEFuc3dlclxuICAgICAgICAgIGNvbnN0IHZhbGlkYXRlZFF1ZXN0aW9ucyA9IHF1aXpEYXRhLnF1ZXN0aW9ucy5tYXAoKHEsIGlkeCkgPT4gKHtcbiAgICAgICAgICAgIGlkOiBpZHggKyAxLFxuICAgICAgICAgICAgcXVlc3Rpb246IHEucXVlc3Rpb24sXG4gICAgICAgICAgICBvcHRpb25zOiBxLm9wdGlvbnMuc2xpY2UoMCwgNCkubWFwKChvcHQsIGkpID0+ICh7XG4gICAgICAgICAgICAgIGlkOiBTdHJpbmcuZnJvbUNoYXJDb2RlKDk3ICsgaSksXG4gICAgICAgICAgICAgIHRleHQ6IG9wdC50ZXh0LFxuICAgICAgICAgICAgfSkpLFxuICAgICAgICAgICAgY29ycmVjdEFuc3dlcjogW1wiYVwiLCBcImJcIiwgXCJjXCIsIFwiZFwiXS5pbmNsdWRlcyhxLmNvcnJlY3RBbnN3ZXI/LnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICAgID8gcS5jb3JyZWN0QW5zd2VyLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgOiBcImFcIixcbiAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICBjb25zdCBxdWl6ID0ge1xuICAgICAgICAgICAgdGl0bGU6IHF1aXpEYXRhLnRpdGxlIHx8IFwiR2VuZXJhdGVkIFF1aXpcIixcbiAgICAgICAgICAgIHNvdXJjZUZpbGU6IFwidXNlci1wcm92aWRlZCBjb250ZW50XCIsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0aW9uczogdmFsaWRhdGVkUXVlc3Rpb25zLmxlbmd0aCxcbiAgICAgICAgICAgIHF1ZXN0aW9uczogdmFsaWRhdGVkUXVlc3Rpb25zLFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBhd2FpdCBta2Rpcih3b3JraW5nRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICBhd2FpdCB3cml0ZUZpbGUob3V0cHV0UGF0aCwgSlNPTi5zdHJpbmdpZnkocXVpeiwgbnVsbCwgMikpO1xuXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBvdXRwdXRQYXRoLFxuICAgICAgICAgICAgcXVlc3Rpb25Db3VudDogdmFsaWRhdGVkUXVlc3Rpb25zLmxlbmd0aCxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBRdWl6IHNhdmVkIHRvICR7b3V0cHV0UGF0aH0uICR7YXV0b09wZW4gPyBcIk9wZW5pbmcgaW4gYnJvd3Nlci4uLlwiIDogXCJcIn1gLFxuICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pLFxuXG4gICAgdG9vbCh7XG4gICAgICBuYW1lOiBcIm9wZW5fcXVpel92aWV3ZXJcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBgT3BlbiB0aGUgcXVpeiB2aWV3ZXIgaW4gdGhlIGJyb3dzZXIgdG8gdGFrZSB0aGUgZ2VuZXJhdGVkIHF1aXouXG5UaGUgcXVpeiB2aWV3ZXIgcHJvdmlkZXMgYW4gaW50ZXJhY3RpdmUgaW50ZXJmYWNlIHdpdGg6XG4tIE9uZSBxdWVzdGlvbiBhdCBhIHRpbWUgZGlzcGxheVxuLSBQcm9ncmVzcyB0cmFja2luZ1xuLSBBbnN3ZXIgc2VsZWN0aW9uXG4tIEZpbmFsIHNjb3JlIGFuZCByZXZpZXcgb2YgYWxsIGFuc3dlcnNcblxuVXNlIHRoaXMgYWZ0ZXIgYSBxdWl6IGhhcyBiZWVuIGdlbmVyYXRlZCBhbmQgc2F2ZWQuYCxcbiAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgcXVpelBhdGg6IHouc3RyaW5nKCkub3B0aW9uYWwoKS5kZXNjcmliZShcIk9wdGlvbmFsIHBhdGggdG8gcXVpei5qc29uIGlmIG5vdCBpbiB3b3JraW5nIGRpcmVjdG9yeVwiKSxcbiAgICAgIH0sXG4gICAgICBpbXBsZW1lbnRhdGlvbjogYXN5bmMgKHsgcXVpelBhdGggfSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHdvcmtpbmdEaXIgPSBjdGwuZ2V0V29ya2luZ0RpcmVjdG9yeSgpO1xuICAgICAgICAgIGNvbnN0IHF1aXpGaWxlID0gcXVpelBhdGggfHwgcGF0aC5qb2luKHdvcmtpbmdEaXIsIFwicXVpei5qc29uXCIpO1xuXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgcXVpeiBmaWxlIGV4aXN0c1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCByZWFkRmlsZShxdWl6RmlsZSwgXCJ1dGYtOFwiKTtcbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICBlcnJvcjogYFF1aXogZmlsZSBub3QgZm91bmQ6ICR7cXVpekZpbGV9LiBQbGVhc2UgZ2VuZXJhdGUgYSBxdWl6IGZpcnN0LmAsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFJldHVybiBpbnN0cnVjdGlvbnMgZm9yIHRoZSB1c2VyIHRvIG9wZW4gdGhlIHF1aXpcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIHF1aXpQYXRoOiBxdWl6RmlsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBRdWl6IGZpbGUgZm91bmQgYXQgJHtxdWl6RmlsZX0uIFRvIHZpZXcgdGhlIHF1aXosIHJ1bjogbnBtIHJ1biB2aWV3YCxcbiAgICAgICAgICAgIGluc3RydWN0aW9uczogXCJUaGUgcXVpeiB2aWV3ZXIgd2lsbCBvcGVuIGluIHlvdXIgZGVmYXVsdCBicm93c2VyIHdpdGggYW4gaW50ZXJhY3RpdmUgaW50ZXJmYWNlLlwiLFxuICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pLFxuICBdO1xufVxuIiwgImltcG9ydCB7IHR5cGUgUGx1Z2luQ29udGV4dCB9IGZyb20gXCJAbG1zdHVkaW8vc2RrXCI7XG5pbXBvcnQgeyBjb25maWdTY2hlbWF0aWNzIH0gZnJvbSBcIi4vY29uZmlnU2NoZW1hdGljcy5qc1wiO1xuaW1wb3J0IHsgdG9vbHNQcm92aWRlciB9IGZyb20gXCIuL3Rvb2xzUHJvdmlkZXIuanNcIjtcblxuLyoqXG4gKiBMTSBTdHVkaW8gUXVpeiBNYWtlciBQbHVnaW5cbiAqIFxuICogVGhpcyBwbHVnaW4gcHJvdmlkZXMgdG9vbHMgZm9yIGdlbmVyYXRpbmcgcXVpenplcyBmcm9tIGF0dGFjaGVkIGZpbGVzLlxuICogSXQgc3VwcG9ydHMgUERGLCBET0NYLCBUWFQsIGFuZCBNRCBmaWxlIGZvcm1hdHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKGNvbnRleHQ6IFBsdWdpbkNvbnRleHQpIHtcbiAgLy8gUmVnaXN0ZXIgdGhlIGNvbmZpZ3VyYXRpb24gc2NoZW1hdGljc1xuICBjb250ZXh0LndpdGhDb25maWdTY2hlbWF0aWNzKGNvbmZpZ1NjaGVtYXRpY3MpO1xuICBcbiAgLy8gUmVnaXN0ZXIgdGhlIHRvb2xzIHByb3ZpZGVyXG4gIGNvbnRleHQud2l0aFRvb2xzUHJvdmlkZXIodG9vbHNQcm92aWRlcik7XG59XG4iLCAiaW1wb3J0IHsgTE1TdHVkaW9DbGllbnQsIHR5cGUgUGx1Z2luQ29udGV4dCB9IGZyb20gXCJAbG1zdHVkaW8vc2RrXCI7XG5cbmRlY2xhcmUgdmFyIHByb2Nlc3M6IGFueTtcblxuLy8gV2UgcmVjZWl2ZSBydW50aW1lIGluZm9ybWF0aW9uIGluIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG5jb25zdCBjbGllbnRJZGVudGlmaWVyID0gcHJvY2Vzcy5lbnYuTE1TX1BMVUdJTl9DTElFTlRfSURFTlRJRklFUjtcbmNvbnN0IGNsaWVudFBhc3NrZXkgPSBwcm9jZXNzLmVudi5MTVNfUExVR0lOX0NMSUVOVF9QQVNTS0VZO1xuY29uc3QgYmFzZVVybCA9IHByb2Nlc3MuZW52LkxNU19QTFVHSU5fQkFTRV9VUkw7XG5cbmNvbnN0IGNsaWVudCA9IG5ldyBMTVN0dWRpb0NsaWVudCh7XG4gIGNsaWVudElkZW50aWZpZXIsXG4gIGNsaWVudFBhc3NrZXksXG4gIGJhc2VVcmwsXG59KTtcblxuKGdsb2JhbFRoaXMgYXMgYW55KS5fX0xNU19QTFVHSU5fQ09OVEVYVCA9IHRydWU7XG5cbmxldCBwcmVkaWN0aW9uTG9vcEhhbmRsZXJTZXQgPSBmYWxzZTtcbmxldCBwcm9tcHRQcmVwcm9jZXNzb3JTZXQgPSBmYWxzZTtcbmxldCBjb25maWdTY2hlbWF0aWNzU2V0ID0gZmFsc2U7XG5sZXQgZ2xvYmFsQ29uZmlnU2NoZW1hdGljc1NldCA9IGZhbHNlO1xubGV0IHRvb2xzUHJvdmlkZXJTZXQgPSBmYWxzZTtcbmxldCBnZW5lcmF0b3JTZXQgPSBmYWxzZTtcblxuY29uc3Qgc2VsZlJlZ2lzdHJhdGlvbkhvc3QgPSBjbGllbnQucGx1Z2lucy5nZXRTZWxmUmVnaXN0cmF0aW9uSG9zdCgpO1xuXG5jb25zdCBwbHVnaW5Db250ZXh0OiBQbHVnaW5Db250ZXh0ID0ge1xuICB3aXRoUHJlZGljdGlvbkxvb3BIYW5kbGVyOiAoZ2VuZXJhdGUpID0+IHtcbiAgICBpZiAocHJlZGljdGlvbkxvb3BIYW5kbGVyU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcmVkaWN0aW9uTG9vcEhhbmRsZXIgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cbiAgICBpZiAodG9vbHNQcm92aWRlclNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJlZGljdGlvbkxvb3BIYW5kbGVyIGNhbm5vdCBiZSB1c2VkIHdpdGggYSB0b29scyBwcm92aWRlclwiKTtcbiAgICB9XG5cbiAgICBwcmVkaWN0aW9uTG9vcEhhbmRsZXJTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldFByZWRpY3Rpb25Mb29wSGFuZGxlcihnZW5lcmF0ZSk7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG4gIHdpdGhQcm9tcHRQcmVwcm9jZXNzb3I6IChwcmVwcm9jZXNzKSA9PiB7XG4gICAgaWYgKHByb21wdFByZXByb2Nlc3NvclNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvbXB0UHJlcHJvY2Vzc29yIGFscmVhZHkgcmVnaXN0ZXJlZFwiKTtcbiAgICB9XG4gICAgcHJvbXB0UHJlcHJvY2Vzc29yU2V0ID0gdHJ1ZTtcbiAgICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5zZXRQcm9tcHRQcmVwcm9jZXNzb3IocHJlcHJvY2Vzcyk7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG4gIHdpdGhDb25maWdTY2hlbWF0aWNzOiAoY29uZmlnU2NoZW1hdGljcykgPT4ge1xuICAgIGlmIChjb25maWdTY2hlbWF0aWNzU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb25maWcgc2NoZW1hdGljcyBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuICAgIGNvbmZpZ1NjaGVtYXRpY3NTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldENvbmZpZ1NjaGVtYXRpY3MoY29uZmlnU2NoZW1hdGljcyk7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG4gIHdpdGhHbG9iYWxDb25maWdTY2hlbWF0aWNzOiAoZ2xvYmFsQ29uZmlnU2NoZW1hdGljcykgPT4ge1xuICAgIGlmIChnbG9iYWxDb25maWdTY2hlbWF0aWNzU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHbG9iYWwgY29uZmlnIHNjaGVtYXRpY3MgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cbiAgICBnbG9iYWxDb25maWdTY2hlbWF0aWNzU2V0ID0gdHJ1ZTtcbiAgICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5zZXRHbG9iYWxDb25maWdTY2hlbWF0aWNzKGdsb2JhbENvbmZpZ1NjaGVtYXRpY3MpO1xuICAgIHJldHVybiBwbHVnaW5Db250ZXh0O1xuICB9LFxuICB3aXRoVG9vbHNQcm92aWRlcjogKHRvb2xzUHJvdmlkZXIpID0+IHtcbiAgICBpZiAodG9vbHNQcm92aWRlclNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vbHMgcHJvdmlkZXIgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cbiAgICBpZiAocHJlZGljdGlvbkxvb3BIYW5kbGVyU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb29scyBwcm92aWRlciBjYW5ub3QgYmUgdXNlZCB3aXRoIGEgcHJlZGljdGlvbkxvb3BIYW5kbGVyXCIpO1xuICAgIH1cblxuICAgIHRvb2xzUHJvdmlkZXJTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldFRvb2xzUHJvdmlkZXIodG9vbHNQcm92aWRlcik7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG4gIHdpdGhHZW5lcmF0b3I6IChnZW5lcmF0b3IpID0+IHtcbiAgICBpZiAoZ2VuZXJhdG9yU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHZW5lcmF0b3IgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cblxuICAgIGdlbmVyYXRvclNldCA9IHRydWU7XG4gICAgc2VsZlJlZ2lzdHJhdGlvbkhvc3Quc2V0R2VuZXJhdG9yKGdlbmVyYXRvcik7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG59O1xuXG5pbXBvcnQoXCIuLy4uL3NyYy9pbmRleC50c1wiKS50aGVuKGFzeW5jIG1vZHVsZSA9PiB7XG4gIHJldHVybiBhd2FpdCBtb2R1bGUubWFpbihwbHVnaW5Db250ZXh0KTtcbn0pLnRoZW4oKCkgPT4ge1xuICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5pbml0Q29tcGxldGVkKCk7XG59KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBleGVjdXRlIHRoZSBtYWluIGZ1bmN0aW9uIG9mIHRoZSBwbHVnaW4uXCIpO1xuICBjb25zb2xlLmVycm9yKGVycm9yKTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnQkFLYTtBQUxiO0FBQUE7QUFBQTtBQUFBLGlCQUF1QztBQUtoQyxJQUFNLHVCQUFtQixtQ0FBdUIsRUFDcEQsTUFBTSxpQkFBaUIsV0FBVztBQUFBLE1BQ2pDLGFBQWE7QUFBQSxNQUNiLE1BQU07QUFBQSxNQUNOLEtBQUs7QUFBQSxNQUNMLEtBQUs7QUFBQSxNQUNMLEtBQUs7QUFBQSxJQUNQLEdBQUcsRUFBRSxFQUNKLE1BQU0sY0FBYyxVQUFVO0FBQUEsTUFDN0IsYUFBYTtBQUFBLE1BQ2IsTUFBTTtBQUFBLE1BQ04sU0FBUztBQUFBLFFBQ1AsRUFBRSxPQUFPLFFBQVEsYUFBYSxPQUFPO0FBQUEsUUFDckMsRUFBRSxPQUFPLFVBQVUsYUFBYSxTQUFTO0FBQUEsUUFDekMsRUFBRSxPQUFPLFFBQVEsYUFBYSxPQUFPO0FBQUEsTUFDdkM7QUFBQSxJQUNGLEdBQUcsUUFBUSxFQUNWLE1BQU0sZ0JBQWdCLFdBQVc7QUFBQSxNQUNoQyxhQUFhO0FBQUEsTUFDYixNQUFNO0FBQUEsSUFDUixHQUFHLElBQUksRUFDTixNQUFNO0FBQUE7QUFBQTs7O0FDZlQsZUFBZSxZQUFZLFVBQW1DO0FBQzVELFFBQU0sZUFBZSxZQUFBQSxRQUFLLFFBQVEsUUFBUTtBQUMxQyxRQUFNLE1BQU0sWUFBQUEsUUFBSyxRQUFRLFlBQVksRUFBRSxZQUFZO0FBQ25ELFFBQU0sV0FBVyxZQUFBQSxRQUFLLFNBQVMsWUFBWTtBQUUzQyxNQUFJO0FBRUosVUFBUSxLQUFLO0FBQUEsSUFDWCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQ0gsZ0JBQVUsVUFBTSwwQkFBUyxjQUFjLE9BQU87QUFDOUM7QUFBQSxJQUVGLEtBQUssUUFBUTtBQUNYLFlBQU0sWUFBWSxVQUFNLDBCQUFTLFlBQVk7QUFDN0MsWUFBTSxTQUFTLElBQUksMEJBQVMsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUMvQyxZQUFNLFNBQVMsTUFBTSxPQUFPLFFBQVE7QUFDcEMsZ0JBQVUsT0FBTztBQUNqQjtBQUFBLElBQ0Y7QUFBQSxJQUVBLEtBQUssU0FBUztBQUNaLFlBQU0sYUFBYSxVQUFNLDBCQUFTLFlBQVk7QUFDOUMsWUFBTSxTQUFTLE1BQU0sZUFBQUMsUUFBUSxlQUFlLEVBQUUsUUFBUSxXQUFXLENBQUM7QUFDbEUsZ0JBQVUsT0FBTztBQUNqQjtBQUFBLElBQ0Y7QUFBQSxJQUVBO0FBQ0UsWUFBTSxJQUFJLE1BQU0sMEJBQTBCLEdBQUcscUNBQXFDO0FBQUEsRUFDdEY7QUFFQSxNQUFJLENBQUMsV0FBVyxRQUFRLEtBQUssRUFBRSxXQUFXLEdBQUc7QUFDM0MsVUFBTSxJQUFJLE1BQU0sNkJBQTZCLFFBQVEsRUFBRTtBQUFBLEVBQ3pEO0FBRUEsU0FBTyxRQUFRLEtBQUs7QUFDdEI7QUErREEsZUFBc0IsY0FBYyxLQUE4QjtBQUNoRSxTQUFPO0FBQUEsUUFDTCxrQkFBSztBQUFBLE1BQ0gsTUFBTTtBQUFBLE1BQ04sYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BVWIsWUFBWTtBQUFBLFFBQ1YsVUFBVSxhQUFFLE9BQU8sRUFBRSxTQUFTLHdDQUF3QztBQUFBLFFBQ3RFLGVBQWUsYUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsU0FBUyxpQ0FBaUM7QUFBQSxRQUMvRixZQUFZLGFBQUUsS0FBSyxDQUFDLFFBQVEsVUFBVSxNQUFNLENBQUMsRUFBRSxRQUFRLFFBQVEsRUFBRSxTQUFTLGtCQUFrQjtBQUFBLE1BQzlGO0FBQUEsTUFDQSxnQkFBZ0IsT0FBTyxFQUFFLFVBQVUsZUFBZSxXQUFXLE1BQU07QUFDakUsWUFBSTtBQUNGLGdCQUFNLFNBQVMsSUFBSSxnQkFBZ0IsZ0JBQXVCO0FBQzFELGdCQUFNLHNCQUFzQixpQkFBaUIsT0FBTyxJQUFJLGVBQWU7QUFDdkUsZ0JBQU0sbUJBQW1CLGNBQWMsT0FBTyxJQUFJLFlBQVk7QUFHOUQsZ0JBQU0sVUFBVSxNQUFNLFlBQVksUUFBUTtBQUMxQyxnQkFBTSxXQUFXLFlBQUFELFFBQUssU0FBUyxRQUFRO0FBR3ZDLGlCQUFPO0FBQUEsWUFDTCxTQUFTO0FBQUEsWUFDVDtBQUFBLFlBQ0EsZ0JBQWdCLFFBQVE7QUFBQSxZQUN4QixrQkFBa0IsUUFBUSxVQUFVLEdBQUcsR0FBSTtBQUFBO0FBQUEsWUFDM0MsY0FBYyw2QkFBNkIsUUFBUSxNQUFNLFFBQVEsTUFBTTtBQUFBLHlDQUMxQyxtQkFBbUIsSUFBSSxnQkFBZ0I7QUFBQTtBQUFBO0FBQUEsVUFHdEU7QUFBQSxRQUNGLFNBQVMsT0FBTztBQUNkLGlCQUFPO0FBQUEsWUFDTCxTQUFTO0FBQUEsWUFDVCxPQUFRLE1BQWdCO0FBQUEsVUFDMUI7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLFFBRUQsa0JBQUs7QUFBQSxNQUNILE1BQU07QUFBQSxNQUNOLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFNYixZQUFZO0FBQUEsUUFDVixVQUFVLGFBQUUsT0FBTztBQUFBLFVBQ2pCLE9BQU8sYUFBRSxPQUFPO0FBQUEsVUFDaEIsV0FBVyxhQUFFLE1BQU0sYUFBRSxPQUFPO0FBQUEsWUFDMUIsVUFBVSxhQUFFLE9BQU87QUFBQSxZQUNuQixTQUFTLGFBQUUsTUFBTSxhQUFFLE9BQU8sRUFBRSxJQUFJLGFBQUUsT0FBTyxHQUFHLE1BQU0sYUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQUEsWUFDL0QsZUFBZSxhQUFFLE9BQU87QUFBQSxVQUMxQixDQUFDLENBQUM7QUFBQSxRQUNKLENBQUMsRUFBRSxTQUFTLHVCQUF1QjtBQUFBLFFBQ25DLFVBQVUsYUFBRSxRQUFRLEVBQUUsUUFBUSxJQUFJLEVBQUUsU0FBUyxpQ0FBaUM7QUFBQSxNQUNoRjtBQUFBLE1BQ0EsZ0JBQWdCLE9BQU8sRUFBRSxVQUFVLFNBQVMsTUFBTTtBQUNoRCxZQUFJO0FBQ0YsZ0JBQU0sYUFBYSxJQUFJLG9CQUFvQjtBQUMzQyxnQkFBTSxhQUFhLFlBQUFBLFFBQUssS0FBSyxZQUFZLFdBQVc7QUFHcEQsY0FBSSxDQUFDLFNBQVMsYUFBYSxTQUFTLFVBQVUsV0FBVyxHQUFHO0FBQzFELG1CQUFPLEVBQUUsU0FBUyxPQUFPLE9BQU8sNEJBQTRCO0FBQUEsVUFDOUQ7QUFHQSxnQkFBTSxxQkFBcUIsU0FBUyxVQUFVLElBQUksQ0FBQyxHQUFHLFNBQVM7QUFBQSxZQUM3RCxJQUFJLE1BQU07QUFBQSxZQUNWLFVBQVUsRUFBRTtBQUFBLFlBQ1osU0FBUyxFQUFFLFFBQVEsTUFBTSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxPQUFPO0FBQUEsY0FDOUMsSUFBSSxPQUFPLGFBQWEsS0FBSyxDQUFDO0FBQUEsY0FDOUIsTUFBTSxJQUFJO0FBQUEsWUFDWixFQUFFO0FBQUEsWUFDRixlQUFlLENBQUMsS0FBSyxLQUFLLEtBQUssR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLFlBQVksQ0FBQyxJQUN2RSxFQUFFLGNBQWMsWUFBWSxJQUM1QjtBQUFBLFVBQ04sRUFBRTtBQUVGLGdCQUFNLE9BQU87QUFBQSxZQUNYLE9BQU8sU0FBUyxTQUFTO0FBQUEsWUFDekIsWUFBWTtBQUFBLFlBQ1osZ0JBQWdCLG1CQUFtQjtBQUFBLFlBQ25DLFdBQVc7QUFBQSxVQUNiO0FBRUEsb0JBQU0sdUJBQU0sWUFBWSxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQzNDLG9CQUFNLDJCQUFVLFlBQVksS0FBSyxVQUFVLE1BQU0sTUFBTSxDQUFDLENBQUM7QUFFekQsaUJBQU87QUFBQSxZQUNMLFNBQVM7QUFBQSxZQUNUO0FBQUEsWUFDQSxlQUFlLG1CQUFtQjtBQUFBLFlBQ2xDLFNBQVMsaUJBQWlCLFVBQVUsS0FBSyxXQUFXLDBCQUEwQixFQUFFO0FBQUEsVUFDbEY7QUFBQSxRQUNGLFNBQVMsT0FBTztBQUNkLGlCQUFPO0FBQUEsWUFDTCxTQUFTO0FBQUEsWUFDVCxPQUFRLE1BQWdCO0FBQUEsVUFDMUI7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLFFBRUQsa0JBQUs7QUFBQSxNQUNILE1BQU07QUFBQSxNQUNOLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BUWIsWUFBWTtBQUFBLFFBQ1YsVUFBVSxhQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyx3REFBd0Q7QUFBQSxNQUNuRztBQUFBLE1BQ0EsZ0JBQWdCLE9BQU8sRUFBRSxTQUFTLE1BQU07QUFDdEMsWUFBSTtBQUNGLGdCQUFNLGFBQWEsSUFBSSxvQkFBb0I7QUFDM0MsZ0JBQU0sV0FBVyxZQUFZLFlBQUFBLFFBQUssS0FBSyxZQUFZLFdBQVc7QUFHOUQsY0FBSTtBQUNGLHNCQUFNLDBCQUFTLFVBQVUsT0FBTztBQUFBLFVBQ2xDLFFBQVE7QUFDTixtQkFBTztBQUFBLGNBQ0wsU0FBUztBQUFBLGNBQ1QsT0FBTyx3QkFBd0IsUUFBUTtBQUFBLFlBQ3pDO0FBQUEsVUFDRjtBQUdBLGlCQUFPO0FBQUEsWUFDTCxTQUFTO0FBQUEsWUFDVCxVQUFVO0FBQUEsWUFDVixTQUFTLHNCQUFzQixRQUFRO0FBQUEsWUFDdkMsY0FBYztBQUFBLFVBQ2hCO0FBQUEsUUFDRixTQUFTLE9BQU87QUFDZCxpQkFBTztBQUFBLFlBQ0wsU0FBUztBQUFBLFlBQ1QsT0FBUSxNQUFnQjtBQUFBLFVBQzFCO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQ0Y7QUFoUkEsSUFBQUUsYUFDQSxZQUNBLGlCQUNBLGtCQUNBLGdCQUNBO0FBTEE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsY0FBOEM7QUFDOUMsaUJBQWtCO0FBQ2xCLHNCQUEyQztBQUMzQyx1QkFBeUI7QUFDekIscUJBQW9CO0FBQ3BCLGtCQUFpQjtBQUNqQjtBQUFBO0FBQUE7OztBQ05BO0FBQUE7QUFBQTtBQUFBO0FBVUEsZUFBc0IsS0FBSyxTQUF3QjtBQUVqRCxVQUFRLHFCQUFxQixnQkFBZ0I7QUFHN0MsVUFBUSxrQkFBa0IsYUFBYTtBQUN6QztBQWhCQTtBQUFBO0FBQUE7QUFDQTtBQUNBO0FBQUE7QUFBQTs7O0FDRkEsSUFBQUMsY0FBbUQ7QUFLbkQsSUFBTSxtQkFBbUIsUUFBUSxJQUFJO0FBQ3JDLElBQU0sZ0JBQWdCLFFBQVEsSUFBSTtBQUNsQyxJQUFNLFVBQVUsUUFBUSxJQUFJO0FBRTVCLElBQU0sU0FBUyxJQUFJLDJCQUFlO0FBQUEsRUFDaEM7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUNGLENBQUM7QUFFQSxXQUFtQix1QkFBdUI7QUFFM0MsSUFBSSwyQkFBMkI7QUFDL0IsSUFBSSx3QkFBd0I7QUFDNUIsSUFBSSxzQkFBc0I7QUFDMUIsSUFBSSw0QkFBNEI7QUFDaEMsSUFBSSxtQkFBbUI7QUFDdkIsSUFBSSxlQUFlO0FBRW5CLElBQU0sdUJBQXVCLE9BQU8sUUFBUSx3QkFBd0I7QUFFcEUsSUFBTSxnQkFBK0I7QUFBQSxFQUNuQywyQkFBMkIsQ0FBQyxhQUFhO0FBQ3ZDLFFBQUksMEJBQTBCO0FBQzVCLFlBQU0sSUFBSSxNQUFNLDBDQUEwQztBQUFBLElBQzVEO0FBQ0EsUUFBSSxrQkFBa0I7QUFDcEIsWUFBTSxJQUFJLE1BQU0sNERBQTREO0FBQUEsSUFDOUU7QUFFQSwrQkFBMkI7QUFDM0IseUJBQXFCLHlCQUF5QixRQUFRO0FBQ3RELFdBQU87QUFBQSxFQUNUO0FBQUEsRUFDQSx3QkFBd0IsQ0FBQyxlQUFlO0FBQ3RDLFFBQUksdUJBQXVCO0FBQ3pCLFlBQU0sSUFBSSxNQUFNLHVDQUF1QztBQUFBLElBQ3pEO0FBQ0EsNEJBQXdCO0FBQ3hCLHlCQUFxQixzQkFBc0IsVUFBVTtBQUNyRCxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0Esc0JBQXNCLENBQUNDLHNCQUFxQjtBQUMxQyxRQUFJLHFCQUFxQjtBQUN2QixZQUFNLElBQUksTUFBTSxzQ0FBc0M7QUFBQSxJQUN4RDtBQUNBLDBCQUFzQjtBQUN0Qix5QkFBcUIsb0JBQW9CQSxpQkFBZ0I7QUFDekQsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLDRCQUE0QixDQUFDLDJCQUEyQjtBQUN0RCxRQUFJLDJCQUEyQjtBQUM3QixZQUFNLElBQUksTUFBTSw2Q0FBNkM7QUFBQSxJQUMvRDtBQUNBLGdDQUE0QjtBQUM1Qix5QkFBcUIsMEJBQTBCLHNCQUFzQjtBQUNyRSxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsbUJBQW1CLENBQUNDLG1CQUFrQjtBQUNwQyxRQUFJLGtCQUFrQjtBQUNwQixZQUFNLElBQUksTUFBTSxtQ0FBbUM7QUFBQSxJQUNyRDtBQUNBLFFBQUksMEJBQTBCO0FBQzVCLFlBQU0sSUFBSSxNQUFNLDREQUE0RDtBQUFBLElBQzlFO0FBRUEsdUJBQW1CO0FBQ25CLHlCQUFxQixpQkFBaUJBLGNBQWE7QUFDbkQsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLGVBQWUsQ0FBQyxjQUFjO0FBQzVCLFFBQUksY0FBYztBQUNoQixZQUFNLElBQUksTUFBTSw4QkFBOEI7QUFBQSxJQUNoRDtBQUVBLG1CQUFlO0FBQ2YseUJBQXFCLGFBQWEsU0FBUztBQUMzQyxXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsd0RBQTRCLEtBQUssT0FBTUMsWUFBVTtBQUMvQyxTQUFPLE1BQU1BLFFBQU8sS0FBSyxhQUFhO0FBQ3hDLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDWix1QkFBcUIsY0FBYztBQUNyQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFVBQVU7QUFDbEIsVUFBUSxNQUFNLG9EQUFvRDtBQUNsRSxVQUFRLE1BQU0sS0FBSztBQUNyQixDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIiwgIm1hbW1vdGgiLCAiaW1wb3J0X3NkayIsICJpbXBvcnRfc2RrIiwgImNvbmZpZ1NjaGVtYXRpY3MiLCAidG9vbHNQcm92aWRlciIsICJtb2R1bGUiXQp9Cg==
