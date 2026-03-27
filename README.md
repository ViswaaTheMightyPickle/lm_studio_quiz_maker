# LM Studio Quiz Maker Plugin

🤖 An LM Studio plugin that generates multiple-choice quizzes from your study materials.

## Features

- 📄 **Multiple File Formats**: PDF, DOCX, TXT, MD support
- 🧠 **AI-Powered**: Uses your local LLM to generate intelligent questions
- ✅ **4-Option Questions**: Each question has 4 answers with 1 correct option
- 🌐 **Web Quiz Viewer**: Beautiful UI to browse, select, and take quizzes
- ⚙️ **Configurable**: Set difficulty, question count, and output directory

## Installation

### Local Development

```bash
git clone https://github.com/ViswaaTheMightyPickle/lm_studio_quiz_maker.git
cd lm_studio_quiz_maker
npm install
npm run dev
```

## Usage

### Step 1: Generate Quiz from File

```
Generate a quiz from this file: /home/user/Downloads/lecture.pdf
```

The plugin will:
- Extract text from the file
- Create a prompt for the LLM to generate questions
- Return instructions for the next step

### Step 2: LLM Generates Questions

The LLM will generate quiz questions as a JSON object with this structure:

```json
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "Question text?",
      "options": [
        {"id": "a", "text": "Option A"},
        {"id": "b", "text": "Option B"},
        {"id": "c", "text": "Option C"},
        {"id": "d", "text": "Option D"}
      ],
      "correctAnswer": "a"
    }
  ]
}
```

### Step 3: Save the Quiz

```
Save this quiz with the name "lecture_notes"
```

The quiz is saved to `~/lmstudio-quizzes/lecture_notes/quiz.json`

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
| `generate_quiz_from_file` | Extract text and generate quiz questions from a file |
| `save_quiz` | Save generated quiz to JSON file |
| `open_quiz_viewer` | Launch web UI to browse and take quizzes |
| `list_available_quizzes` | Show all quizzes in the directory |

## Configuration

Configure in LM Studio plugin settings:

| Setting | Default | Description |
|---------|---------|-------------|
| Default Question Count | 10 | Questions to generate per quiz |
| Default Difficulty | medium | easy/medium/hard |
| Quiz Output Dir | ~/lmstudio-quizzes | Where to store quizzes |

## Directory Structure

```
~/lmstudio-quizzes/
├── lecture_notes/
│   └── quiz.json
├── chapter_5/
│   └── quiz.json
└── ...
```

## Example Conversation

```
User: Generate a quiz from /home/user/Downloads/ml-lecture.pdf

AI: I've extracted 12,500 characters from "ml-lecture.pdf". 
    Please generate 10 quiz questions at medium difficulty.
    [Provides prompt for LLM]

LLM: {"title": "Machine Learning Quiz", "questions": [...]}

AI: Great! Let me save this quiz for you.
    [Calls save_quiz tool]
    Quiz saved to ~/lmstudio-quizzes/ml_lecture/quiz.json

User: Open the quiz viewer

AI: Quiz viewer is running at http://localhost:3456
    You can now take the Machine Learning quiz!
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
