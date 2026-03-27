# LM Studio Quiz Maker Plugin - Architecture

## Overview

Simple, streamlined quiz generation plugin for LM Studio.

---

## Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Generate  │────▶│     LLM     │────▶│    Save     │────▶│    Open     │
│   from File │     │  Generates  │     │    Quiz     │     │   Viewer    │
│             │     │  Questions  │     │   to JSON   │     │  (Web UI)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Tools

### 1. generate_quiz_from_file

**Purpose:** Extract text from document and prepare quiz generation

**Parameters:**
- `filePath` (string): Absolute path to document
- `questionCount` (number): 1-50 questions
- `difficulty` (enum): easy/medium/hard
- `outputDir` (optional string): Output directory

**Process:**
1. Read file (PDF/DOCX/TXT/MD)
2. Extract text content
3. Truncate to 15,000 chars if needed
4. Create quiz generation prompt
5. Return prompt for LLM to process

**Returns:**
```typescript
{
  success: true;
  fileName: string;
  characterCount: number;
  contentForQuiz: string;  // Truncated content
  prompt: string;          // Full prompt for LLM
  outputDir: string;
  message: string;
  instructions: string;
}
```

### 2. save_quiz

**Purpose:** Save generated quiz to JSON file

**Parameters:**
- `quizData` (object): Quiz with title and questions
- `documentName` (string): Source document name
- `outputDir` (optional string): Output directory

**Returns:**
```typescript
{
  success: true;
  quizPath: string;
  questionCount: number;
  message: string;
}
```

### 3. open_quiz_viewer

**Purpose:** Start quiz viewer HTTP server

**Parameters:**
- `quizDir` (optional string): Quiz directory

**Returns:**
```typescript
{
  success: true;
  viewerUrl: "http://localhost:3456";
  quizDir: string;
}
```

### 4. list_available_quizzes

**Purpose:** List all quizzes in directory

---

## Data Structures

### Quiz

```typescript
{
  title: string;
  sourceDocument: string;
  sourceFile: string;
  totalQuestions: number;
  questions: QuizQuestion[];
  createdAt: string;
}
```

### QuizQuestion

```typescript
{
  id: number;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;  // "a", "b", "c", or "d"
}
```

---

## Quiz Viewer Server

**Port:** 3456

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serve quiz viewer HTML |
| `/api/quizzes` | GET | List available quizzes |
| `/api/quiz?path=...` | GET | Load specific quiz |

---

## File Structure

```
src/
├── index.ts              # Plugin entry point
├── configSchematics.ts   # Configuration schema
├── toolsProvider.ts      # 4 tools registration
├── quiz-generator.ts     # Quiz types & utilities
├── quiz-server.ts        # HTTP server for quiz viewer
└── quiz-viewer.html      # Web UI for taking quizzes
```

---

## Configuration

```typescript
{
  defaultQuestionCount: number;  // 1-50, default: 10
  difficulty: "easy" | "medium" | "hard";  // default: medium
  quizOutputDir: string;  // default: "" (uses ~/lmstudio-quizzes)
}
```

---

## Error Handling

All tools return structured responses:

```typescript
// Success
{
  success: true;
  // ... data fields
}

// Error
{
  success: false;
  error: string;
}
```
