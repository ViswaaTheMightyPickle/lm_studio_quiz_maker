# LM Studio Quiz Maker - Project Plan

## Overview
AI-powered quiz generator that accepts file attachments, uses LM Studio to generate multiple-choice questions, and provides a browser-based quiz interface.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Quiz Maker System                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   File       │    │   Quiz       │    │   Browser    │  │
│  │   Processor  │───▶│  Generator   │───▶│   Quiz UI    │  │
│  │  (index.ts)  │    │ (generator)  │    │   (HTML/JS)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  File Input  │    │  JSON Quiz   │    │   Results    │  │
│  │  (PDF/TXT/   │    │   Output     │    │   Display    │  │
│  │   MD/DOCX)   │    │   (quiz.json)│    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Discrete Steps

### Step 1: Project Setup & Git Configuration
- [x] Update LICENSE to MIT
- [x] Update package.json with author info
- [ ] Initialize git repository
- [ ] Configure git user (ViswaaTheMightyPickle / thereddragonspeaks22919@protonmail.com)
- [ ] Create initial commit
- [ ] Create GitHub repo: `lm_studio_quiz_maker`
- [ ] Push to remote

### Step 2: File Processing Module (`src/file-processor.ts`)
**Purpose:** Read and extract text from various file formats

**Features:**
- Accept file paths as command-line arguments
- Support multiple formats: `.txt`, `.md`, `.pdf`, `.docx`
- Extract plain text content for AI processing
- Handle encoding issues gracefully

**Dependencies to add:**
- `pdf-parse` for PDF files
- `mammoth` for DOCX files
- `fs/promises` (built-in) for TXT/MD

### Step 3: Quiz Generator Module (`src/quiz-generator.ts`)
**Purpose:** Use LM Studio AI to generate quiz questions from text

**Features:**
- Connect to LM Studio local server
- Send extracted text with structured prompt
- Parse AI response into structured quiz format
- Generate 4 answer options per question (1 correct, 3 distractors)
- Output validated JSON structure

**Quiz JSON Schema:**
```json
{
  "title": "Quiz Title",
  "sourceFile": "filename.pdf",
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": [
        { "id": "a", "text": "Option A" },
        { "id": "b", "text": "Option B" },
        { "id": "c", "text": "Option C" },
        { "id": "d", "text": "Option D" }
      ],
      "correctAnswer": "a"
    }
  ]
}
```

### Step 4: CLI Interface (`src/index.ts`)
**Purpose:** Main entry point orchestrating file processing and quiz generation

**Features:**
- Accept file arguments: `npm start -- path/to/file.pdf`
- Process file through file-processor
- Generate quiz via quiz-generator
- Save output to `quiz.json`
- Display progress and errors

### Step 5: Browser Quiz UI (`dist/quiz.html`)
**Purpose:** Interactive quiz interface for taking the generated quiz

**Features:**
- Load `quiz.json` from same directory
- Display one question at a time
- Radio button selection for 4 options
- Navigation: Previous/Next buttons
- Progress indicator (e.g., "Question 3 of 10")
- Submit button at end
- Results screen showing:
  - Score (X/Y correct)
  - Percentage
  - Review of all questions with correct answers highlighted

**Tech Stack:**
- Vanilla HTML/CSS/JavaScript (no build step needed)
- Fetch API to load quiz.json
- LocalStorage for answer persistence (optional)

### Step 6: Quiz Viewer Launcher (`src/viewer.ts`)
**Purpose:** Generate and open quiz HTML in browser

**Features:**
- Check if `quiz.json` exists
- Copy/embed quiz data into HTML template
- Launch default browser
- Command: `npm run view`

### Step 7: Package.json Scripts
Add new npm scripts:
```json
{
  "scripts": {
    "start": "tsc && node --enable-source-maps dist/index.js",
    "build": "tsc",
    "generate": "tsc && node --enable-source-maps dist/index.js",
    "view": "tsc && node --enable-source-maps dist/viewer.js",
    "clean": "rm -rf dist"
  }
}
```

---

## File Structure

```
quizzer/
├── src/
│   ├── index.ts           # Main CLI entry
│   ├── file-processor.ts  # File reading/extraction
│   ├── quiz-generator.ts  # AI quiz generation
│   └── viewer.ts          # Browser launcher
├── dist/
│   ├── index.js
│   ├── file-processor.js
│   ├── quiz-generator.js
│   ├── viewer.js
│   └── quiz.html          # Generated quiz UI
├── quiz.json              # Generated quiz output
├── package.json
├── tsconfig.json
├── LICENSE
├── README.md
└── agents.md              # This file
```

---

## Usage Flow

1. **Generate Quiz:**
   ```bash
   npm run generate -- ./study-materials.pdf
   ```
   → Creates `quiz.json`

2. **Take Quiz:**
   ```bash
   npm run view
   ```
   → Opens browser with interactive quiz

---

## Future Enhancements (Post-MVP)
- [ ] Custom number of questions
- [ ] Difficulty level selection
- [ ] Multiple file batch processing
- [ ] Export results to CSV
- [ ] Timer for quiz
- [ ] Shuffle questions/options
- [ ] LMS integration (picklerick)
