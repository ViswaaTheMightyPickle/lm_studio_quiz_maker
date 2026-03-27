import { type PluginContext } from "@lmstudio/sdk";
import { configSchematics } from "./configSchematics.js";
import { toolsProvider } from "./toolsProvider.js";

/**
 * LM Studio Quiz Maker Plugin
 * 
 * This plugin provides tools for generating quizzes from attached files.
 * Workflow:
 * 1. process_document_for_quiz - Convert file to markdown and chunk it
 * 2. generate_quiz_from_chunks - Generate questions from each chunk (multi-pass)
 * 3. finalize_quiz - Combine all questions into final quiz JSON
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
