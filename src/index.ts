import { type PluginContext } from "@lmstudio/sdk";
import { configSchematics } from "./configSchematics.js";
import { toolsProvider } from "./toolsProvider.js";

/**
 * LM Studio Quiz Maker Plugin
 * 
 * Simplified workflow for generating quizzes from documents:
 * 1. generate_quiz_from_file - Extract text and create quiz generation prompt
 * 2. LLM generates questions as JSON
 * 3. save_quiz - Save the quiz to JSON file
 * 4. open_quiz_viewer - Launch web UI to take quizzes
 * 
 * Supports: PDF, DOCX, TXT, MD
 */
export async function main(context: PluginContext) {
  // Register the configuration schematics
  context.withConfigSchematics(configSchematics);
  
  // Register the tools provider
  context.withToolsProvider(toolsProvider);
}
