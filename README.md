# LM Studio Quiz Maker Plugin

🤖 An LM Studio plugin that generates multiple-choice quizzes from your study materials using a RAG-inspired workflow.

## Features

- 📄 **Multiple File Formats**: PDF, DOCX, TXT, MD support
- 🔄 **Document Chunking**: Automatically splits large documents into manageable chunks
- 🧠 **Multi-Pass Generation**: Generates questions chunk-by-chunk to avoid context limits
- 📁 **Organized Storage**: Stores processed documents and quizzes in structured directories
- 🌐 **Web Quiz Viewer**: Beautiful UI to select and take quizzes
- ⚙️ **Configurable**: Set difficulty, questions per chunk, and output directory

## Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Attach    │────▶│   Process   │────▶│  Generate   │────▶│  Finalize   │
│   Document  │     │  (→MD+Chunk)│     │  Questions  │     │    Quiz     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Take Quiz  │◀────│  Select     │◀────│   Open      │◀────│   Save to   │
│   in Web    │     │   Quiz      │     │   Viewer    │     │   JSON      │
│   Browser   │     │ Directory   │     │  (Server)   │     │   File      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/ViswaaTheMightyPickle/lm_studio_quiz_maker.git
cd lm_studio_quiz_maker

# Install dependencies
npm install

# Build and link to LM Studio
npm run dev
```

## Usage

### Step 1: Process a Document

Tell the AI to process your document:

```
Process this document for quiz generation: /home/user/Downloads/lecture.pdf
```

This will:
- Convert the file to markdown
- Split it into chunks (~2500 chars each)
- Store in `~/lmstudio-quizzes/lecture_name/`

### Step 2: Generate Questions

```
Generate quiz questions from the lecture_notes document, 3 questions per chunk, medium difficulty
```

This will:
- Process each chunk separately (avoids context limits)
- Generate questions chunk-by-chunk
- Collect all questions

### Step 3: Finalize the Quiz

```
Finalize the quiz with all generated questions
```

This combines all questions into `quiz.json`.

### Step 4: Open Quiz Viewer

```
Open the quiz viewer
```

This starts a web server at `http://localhost:3456` where you can:
- Browse all available quizzes
- Select a quiz to take
- Answer questions one at a time
- See results and review answers

## Available Tools

| Tool | Description |
|------|-------------|
| `process_document_for_quiz` | Convert file to markdown and chunk it |
| `generate_quiz_from_chunks` | Generate questions from each chunk (multi-pass) |
| `finalize_quiz` | Combine all questions into final quiz JSON |
| `open_quiz_viewer` | Launch web UI to browse and take quizzes |
| `list_available_quizzes` | Show all quizzes in the directory |

## Configuration

Configure in LM Studio plugin settings:

| Setting | Default | Description |
|---------|---------|-------------|
| Questions per Chunk | 2 | Questions to generate from each chunk |
| Difficulty | medium | easy/medium/hard |
| Quiz Output Dir | ~/lmstudio-quizzes | Where to store quizzes |
| Auto-open Viewer | true | Open browser after quiz generation |

## Directory Structure

```
~/lmstudio-quizzes/
├── lecture_notes/
│   ├── lecture_notes.md      # Converted markdown
│   ├── chunks/
│   │   ├── chunk_001.md
│   │   ├── chunk_002.md
│   │   └── ...
│   └── quiz.json             # Final quiz
├── chapter_5/
│   ├── chapter_5.md
│   ├── chunks/
│   │   └── ...
│   └── quiz.json
└── ...
```

## Example Conversation

```
User: Process this document: /home/user/Downloads/ml-lecture.pdf

AI: I've processed "ml-lecture.pdf" into 8 chunks. The document has been 
    converted to markdown and stored in ~/lmstudio-quizzes/ml_lecture/

User: Generate 3 questions per chunk at medium difficulty

AI: I'll generate questions from each of the 8 chunks. That's 24 questions total.
    [Processes each chunk...]
    All questions generated!

User: Finalize the quiz

AI: Quiz saved to ~/lmstudio-quizzes/ml_lecture/quiz.json with 24 questions.

User: Open the quiz viewer

AI: Quiz viewer is running at http://localhost:3456
    You can now select and take the ml_lecture quiz!
```

## Development Commands

```bash
npm run dev    # Watch mode, links to LM Studio
npm run build  # Compile TypeScript
npm run push   # Push to LM Studio Hub
```

## Requirements

- **LM Studio** v0.8.0+
- **Node.js** v18+
- A local LLM loaded in LM Studio

## License

MIT License - see [LICENSE](LICENSE)

## Author

**ViswaaTheMightyPickle**
