import { createConfigSchematics } from "@lmstudio/sdk";

/**
 * Plugin configuration options
 */
export const configSchematics = createConfigSchematics()
  .field("questionCount", "numeric", {
    displayName: "Number of Questions",
    hint: "How many quiz questions to generate from the content",
    min: 1,
    max: 50,
    int: true,
  }, 10)
  .field("difficulty", "select", {
    displayName: "Difficulty Level",
    hint: "Difficulty level of generated questions",
    options: [
      { value: "easy", displayName: "Easy" },
      { value: "medium", displayName: "Medium" },
      { value: "hard", displayName: "Hard" },
    ],
  }, "medium")
  .field("autoOpenQuiz", "boolean", {
    displayName: "Auto-open Quiz",
    hint: "Automatically open the quiz in browser after generation",
  }, true)
  .build();
