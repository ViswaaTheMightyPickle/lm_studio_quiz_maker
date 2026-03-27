import { LMStudioClient } from "@lmstudio/sdk";

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
}

export interface Quiz {
  title: string;
  sourceFile: string;
  totalQuestions: number;
  questions: QuizQuestion[];
}

/**
 * Generate quiz questions from text content using LM Studio
 */
export async function generateQuiz(
  content: string,
  sourceFile: string,
  questionCount: number = 10,
  client: LMStudioClient = new LMStudioClient()
): Promise<Quiz> {
  const prompt = `You are an expert quiz generator. Based on the following text, create ${questionCount} multiple-choice questions.

RULES:
1. Each question must have exactly 4 answer options (A, B, C, D)
2. Only ONE option should be correct
3. Make distractors (wrong answers) plausible but clearly incorrect
4. Questions should test comprehension, not just recall
5. Vary question difficulty (mix of easy, medium, hard)
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

  console.log("\n🤖 Generating quiz questions using AI...\n");

  const model = await client.llm.model();
  const response = await model.respond(prompt, {
    maxTokens: 4096,
    temperature: 0.7,
  });

  // Extract JSON from response (handle potential markdown code blocks)
  let jsonStr = response.content.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  let quizData: { title: string; questions: Array<{ question: string; options: QuizOption[]; correctAnswer: string }> };
  try {
    quizData = JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse AI response as JSON:");
    console.error("Raw response:", response.content);
    throw new Error("AI response was not valid JSON. Please try again.");
  }

  // Validate and transform the quiz data
  if (!quizData.questions || quizData.questions.length === 0) {
    throw new Error("No questions were generated. The AI may need more content to work with.");
  }

  const validatedQuestions: QuizQuestion[] = quizData.questions.map((q, index) => {
    // Ensure we have exactly 4 options
    const options = q.options.slice(0, 4);
    while (options.length < 4) {
      options.push({ id: String.fromCharCode(97 + options.length), text: "Not provided" });
    }

    // Ensure correctAnswer is valid
    const validAnswers = ["a", "b", "c", "d"];
    const correctAnswer = validAnswers.includes(q.correctAnswer.toLowerCase())
      ? q.correctAnswer.toLowerCase()
      : "a";

    return {
      id: index + 1,
      question: q.question,
      options: options.map((opt, i) => ({
        id: String.fromCharCode(97 + i),
        text: opt.text,
      })),
      correctAnswer,
    };
  });

  return {
    title: quizData.title || `Quiz: ${sourceFile}`,
    sourceFile,
    totalQuestions: validatedQuestions.length,
    questions: validatedQuestions,
  };
}

/**
 * Validate a quiz structure
 */
export function validateQuiz(quiz: Quiz): boolean {
  for (const question of quiz.questions) {
    if (question.options.length !== 4) {
      console.error(`Question ${question.id} does not have exactly 4 options`);
      return false;
    }

    if (!["a", "b", "c", "d"].includes(question.correctAnswer)) {
      console.error(`Question ${question.id} has invalid correctAnswer: ${question.correctAnswer}`);
      return false;
    }
  }
  return true;
}
