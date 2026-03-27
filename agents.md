# LM Studio Quiz Maker Plugin - Architecture

## Overview

RAG-inspired quiz generation plugin for LM Studio that processes documents, chunks them, and generates quizzes through multi-pass LLM calls.

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LM Studio Quiz Maker Flow                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐                                                            │
│  │   User       │                                                            │
│  │   attaches   │                                                            │
│  │   document   │                                                            │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  1. process_document_for_quiz                                          │ │
│  │     • Read file (PDF/DOCX/TXT/MD)                                      │ │
│  │     • Convert to markdown                                              │ │
│  │     • Split into chunks (~2500 chars)                                  │ │
│  │     • Store in ~/lmstudio-quizzes/{doc_name}/                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                    │
│         ▼                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  2. generate_quiz_from_chunks                                          │ │
│  │     • For each chunk:                                                  │ │
│  │       - Create quiz generation prompt                                  │ │
│  │       - LLM generates 2-3 questions                                    │ │
│  │       - Parse JSON response                                            │ │
│  │     • Avoids context limits with multi-pass                            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                    │
│         ▼                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  3. finalize_quiz                                                      │ │
│  │     • Combine all questions from all chunks                            │ │
│  │     • Validate structure (4 options, 1 correct)                        │ │
│  │     • Save to quiz.json                                                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                    │
│         ▼                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  4. open_quiz_viewer                                                   │ │
│  │     • Start HTTP server (port 3456)                                    │ │
│  │     • Serve quiz selection UI                                          │ │
│  │     • User selects quiz → takes quiz → sees results                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── index.ts                 # Plugin entry point
├── configSchematics.ts      # Configuration schema
├── toolsProvider.ts         # 5 tools registration
├── document-processor.ts    # File conversion & chunking
├── quiz-workflow.ts         # Multi-pass quiz generation
├── quiz-generator.ts        # Quiz types & utilities
├── quiz-server.ts           # HTTP server for quiz viewer
└── quiz-viewer.html         # Web UI for taking quizzes
```

---

## Tools

### 1. process_document_for_quiz

**Purpose:** Convert document to markdown and chunk it

**Parameters:**
- `filePath` (string): Absolute path to document
- `outputDir` (optional string): Output directory

**Returns:**
```typescript
{
  success: boolean;
  fileName: string;
  baseName: string;
  markdownPath: string;
  chunksPath: string;
  totalChunks: number;
  message: string;
}
```

### 2. generate_quiz_from_chunks

**Purpose:** Generate questions from each chunk

**Parameters:**
- `documentName` (string): Processed document name
- `questionsPerChunk` (number): 1-10 questions per chunk
- `difficulty` (enum): easy/medium/hard
- `outputDir` (optional string): Document directory

**Returns:**
```typescript
{
  success: boolean;
  totalChunks: number;
  questionsToGenerate: number;
  instructions: string;
}
```

### 3. finalize_quiz

**Purpose:** Combine questions into final quiz JSON

**Parameters:**
- `documentName` (string): Document name
- `allQuestions` (array): All generated questions
- `outputDir` (optional string): Output directory

**Returns:**
```typescript
{
  success: boolean;
  quizPath: string;
  questionCount: number;
}
```

### 4. open_quiz_viewer

**Purpose:** Start quiz viewer server

**Parameters:**
- `quizDir` (optional string): Quiz directory

**Returns:**
```typescript
{
  success: boolean;
  viewerUrl: string;  // http://localhost:3456
  quizDir: string;
}
```

### 5. list_available_quizzes

**Purpose:** List all quizzes in directory

**Parameters:**
- `quizDir` (optional string): Directory to search

---

## Data Structures

### ProcessedDocument

```typescript
{
  originalPath: string;
  fileName: string;
  baseName: string;
  markdownPath: string;
  chunksPath: string;
  totalChunks: number;
}
```

### QuizQuestion

```typescript
{
  id: number;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;  // "a", "b", "c", or "d"
  sourceChunk?: number;
}
```

### Quiz

```typescript
{
  title: string;
  sourceDocument: string;
  sourceFile: string;
  totalQuestions: number;
  questions: QuizQuestion[];
  createdAt: string;  // ISO timestamp
}
```

---

## Chunking Strategy

Documents are split into chunks of ~2500 characters:

1. Split on section boundaries (`## ` headings)
2. Merge sections until approaching max size
3. Further split oversized sections by paragraphs
4. Each chunk saved as `chunk_NNN.md` with frontmatter

```markdown
---
chunk: 1
total: 8
---

Chunk content here...
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

### Quiz Viewer Features

- Directory selection UI
- Quiz card grid with metadata
- One-question-at-a-time display
- Progress bar
- Answer selection with highlighting
- Submit with confirmation
- Score display with percentage
- Full review with correct answers

---

## Configuration

```typescript
{
  questionsPerChunk: number;  // 1-10, default: 2
  difficulty: "easy" | "medium" | "hard";  // default: medium
  quizOutputDir: string;  // default: "" (uses ~/lmstudio-quizzes)
  autoOpenViewer: boolean;  // default: true
}
```

---

## Error Handling

All tools return structured error responses:

```typescript
{
  success: false;
  error: string;  // Human-readable error message
}
```

Common errors:
- File not found
- Unsupported file type
- Empty document
- No chunks found
- Invalid quiz data
- Server already running

---

## Future Enhancements

- [ ] Image support in chunks
- [ ] Table extraction from PDFs
- [ ] Question difficulty auto-adjustment
- [ ] Quiz export (PDF, Anki, CSV)
- [ ] Spaced repetition integration
- [ ] Multi-language support
- [ ] Question type variations (T/F, matching)
- [ ] Quiz sharing/collaboration
