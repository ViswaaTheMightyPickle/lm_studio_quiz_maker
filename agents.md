# LM Studio Quiz Maker Plugin - Development Plan

## Overview

This is an **LM Studio Plugin** that provides tools for generating quizzes from attached files using local LLMs.

---

## Plugin Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LM Studio Application                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Quiz Maker Plugin                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │     File     │  │     Quiz     │  │   Quiz     │  │   │
│  │  │  Extractor   │  │  Generator   │  │  Viewer    │  │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │   │
│  │         │                 │                │          │   │
│  │         ▼                 ▼                ▼          │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │           Tools Provider                      │    │   │
│  │  │  • generate_quiz_from_file                    │    │   │
│  │  │  • create_quiz_json                           │    │   │
│  │  │  • open_quiz_viewer                           │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Files

### `manifest.json`
Plugin metadata for LM Studio Hub:
```json
{
  "type": "plugin",
  "runner": "node",
  "owner": "ViswaaTheMightyPickle",
  "name": "quiz-maker",
  "revision": 1
}
```

### `src/index.ts`
Plugin entry point - registers config and tools provider.

### `src/configSchematics.ts`
Defines configurable options:
- `questionCount`: Number of questions (1-50)
- `difficulty`: easy/medium/hard
- `autoOpenQuiz`: Auto-open browser after generation

### `src/toolsProvider.ts`
Exports three tools:

1. **`generate_quiz_from_file`**
   - Extracts text from PDF/DOCX/TXT/MD
   - Returns content + instructions for LLM to generate questions
   - Parameters: filePath, questionCount, difficulty

2. **`create_quiz_json`**
   - Validates and saves quiz to quiz.json
   - Ensures 4 options per question
   - Parameters: quizData, autoOpen

3. **`open_quiz_viewer`**
   - Opens quiz.html in browser
   - Provides interactive quiz interface
   - Parameters: quizPath (optional)

---

## Tool Flow

```
User attaches file
       │
       ▼
┌─────────────────┐
│ generate_quiz_  │
│ from_file       │
└────────┬────────┘
         │
         ▼
  Extract text from file
         │
         ▼
  Return content + instructions
         │
         ▼
  LLM generates questions as JSON
         │
         ▼
┌─────────────────┐
│ create_quiz_json│
└────────┬────────┘
         │
         ▼
  Validate & save quiz.json
         │
         ▼
┌─────────────────┐
│ open_quiz_viewer│
└────────┬────────┘
         │
         ▼
  Open browser with quiz UI
```

---

## Quiz JSON Schema

```typescript
{
  title: string;
  sourceFile: string;
  totalQuestions: number;
  questions: Array<{
    id: number;
    question: string;
    options: Array<{ id: string; text: string }>;
    correctAnswer: string; // "a", "b", "c", or "d"
  }>;
}
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode for development (links to LM Studio) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm run push` | Push plugin to LM Studio Hub |

---

## Publishing to LM Studio Hub

1. Build the plugin: `npm run build`
2. Ensure manifest.json has correct owner/name/revision
3. Authenticate with LM Studio Hub
4. Run: `npm run push`
5. Plugin will be available at: `https://lmstudio.ai/{owner}/{name}`

---

## Future Enhancements

- [ ] Add thumbnail.png for plugin gallery
- [ ] Support for image-based questions
- [ ] Quiz difficulty adaptation based on user performance
- [ ] Export results to CSV/PDF
- [ ] Multiple quiz templates
- [ ] Timer mode for quizzes
- [ ] Shuffle questions/options
- [ ] Category/tag support for questions
