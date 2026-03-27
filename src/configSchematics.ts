import { createConfigSchematics } from "@lmstudio/sdk";

/**
 * Plugin configuration options
 */
export const configSchematics = createConfigSchematics()
  .field("questionsPerChunk", "numeric", {
    displayName: "Questions per Chunk",
    hint: "Number of questions to generate from each document chunk",
    min: 1,
    max: 10,
    int: true,
  }, 2)
  .field("difficulty", "select", {
    displayName: "Difficulty Level",
    hint: "Difficulty level of generated questions",
    options: [
      { value: "easy", displayName: "Easy" },
      { value: "medium", displayName: "Medium" },
      { value: "hard", displayName: "Hard" },
    ],
  }, "medium")
  .field("quizOutputDir", "string", {
    displayName: "Quiz Output Directory",
    hint: "Default directory for storing processed documents and quizzes",
    placeholder: "~/lmstudio-quizzes",
  }, "")
  .field("autoOpenViewer", "boolean", {
    displayName: "Auto-open Quiz Viewer",
    hint: "Automatically open the quiz viewer after generating a quiz",
  }, true)
  .build();
