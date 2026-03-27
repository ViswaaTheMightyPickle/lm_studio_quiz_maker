import { type PluginContext } from "@lmstudio/sdk";
import { configSchematics } from "./configSchematics.js";
import { toolsProvider } from "./toolsProvider.js";

/**
 * LM Studio Quiz Maker Plugin
 * 
 * This plugin provides tools for generating quizzes from attached files.
 * It supports PDF, DOCX, TXT, and MD file formats.
 */
export async function main(context: PluginContext) {
  // Register the configuration schematics
  context.withConfigSchematics(configSchematics);
  
  // Register the tools provider
  context.withToolsProvider(toolsProvider);
}
