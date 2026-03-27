import { createConfigSchematics } from "@lmstudio/sdk";

/**
 * Plugin configuration options
 */
export const configSchematics = createConfigSchematics()
  .field("defaultQuestionCount", "numeric", {
    displayName: "Default Question Count",
    hint: "Default number of questions to generate per quiz",
    min: 1,
    max: 50,
    int: true,
  }, 10)
  .field("difficulty", "select", {
    displayName: "Default Difficulty",
    hint: "Default difficulty level for generated questions",
    options: [
      { value: "easy", displayName: "Easy" },
      { value: "medium", displayName: "Medium" },
      { value: "hard", displayName: "Hard" },
    ],
  }, "medium")
  .field("quizOutputDir", "string", {
    displayName: "Quiz Output Directory",
    hint: "Default directory for storing quizzes (empty = ~/lmstudio-quizzes)",
    placeholder: "~/lmstudio-quizzes",
  }, "")
  .build();
