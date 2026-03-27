import { LMStudioClient } from "@lmstudio/sdk";
import { writeFile } from "fs/promises";
import { processFiles, combineContent } from "./file-processor.js";
import { generateQuiz, validateQuiz } from "./quiz-generator.js";

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const filePaths: string[] = [];
  let questionCount = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n" || args[i] === "--questions") {
      questionCount = parseInt(args[++i], 10) || 10;
    } else if (!args[i].startsWith("-")) {
      filePaths.push(args[i]);
    }
  }

  if (filePaths.length === 0) {
    console.log(`
📚 LM Studio Quiz Maker
━━━━━━━━━━━━━━━━━━━━━━

Usage:
  npm run generate -- <file1> [file2...] [-n <questionCount>]

Examples:
  npm run generate -- ./notes.pdf
  npm run generate -- ./chapter1.pdf ./chapter2.pdf -n 15
  npm run generate -- ./readings/*.txt

Supported formats: .txt, .md, .pdf, .docx

To view the quiz after generation:
  npm run view
`);
    process.exit(0);
  }

  try {
    console.log("\n📝 LM Studio Quiz Maker");
    console.log("━━━━━━━━━━━━━━━━━━━━━━\n");

    // Process input files
    console.log(`Processing ${filePaths.length} file(s)...\n`);
    const processedFiles = await processFiles(filePaths);
    const combinedContent = combineContent(processedFiles);

    // Generate quiz
    const client = new LMStudioClient();
    const sourceName = processedFiles.length === 1
      ? processedFiles[0].fileName
      : `${processedFiles.length} files`;

    const quiz = await generateQuiz(combinedContent, sourceName, questionCount, client);

    // Validate quiz
    if (!validateQuiz(quiz)) {
      throw new Error("Generated quiz failed validation");
    }

    // Save quiz to JSON
    const outputPath = "quiz.json";
    await writeFile(outputPath, JSON.stringify(quiz, null, 2));

    console.log("\n✅ Quiz generated successfully!");
    console.log(`   Title: ${quiz.title}`);
    console.log(`   Questions: ${quiz.totalQuestions}`);
    console.log(`   Output: ${outputPath}`);
    console.log("\n🎯 To take the quiz, run:");
    console.log(`   npm run view\n`);

  } catch (error) {
    console.error("\n❌ Error:", (error as Error).message);
    console.error("\nMake sure LM Studio server is running: lms server start\n");
    process.exit(1);
  }
}

main();
