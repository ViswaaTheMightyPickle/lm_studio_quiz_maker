# LM Studio Quiz Maker Plugin

🤖 An LM Studio plugin that generates multiple-choice quizzes from your study materials.

## Features

- 📄 **File Support**: Process PDF, DOCX, TXT, and MD files
- 🧠 **AI-Powered**: Uses your local LLM to generate intelligent questions
- ✅ **4-Option Questions**: Each question has 4 answers with 1 correct option
- ⚙️ **Configurable**: Set question count and difficulty level
- 🌐 **Quiz Viewer**: Built-in HTML viewer for taking quizzes

## Installation

### Option 1: From LM Studio Hub (Recommended)

1. Open LM Studio
2. Go to **Discover** → **Plugins**
3. Search for "quiz-maker"
4. Click **Install**

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/ViswaaTheMightyPickle/lm_studio_quiz_maker.git
cd lm_studio_quiz_maker

# Install dependencies
npm install

# Build the plugin
npm run build

# Link to LM Studio for development
npm run dev
```

## Usage

### In LM Studio Chat

1. **Attach a file** (PDF, DOCX, TXT, or MD) to your chat
2. **Ask the AI** to generate a quiz, e.g.:
   - "Generate a quiz from this file"
   - "Create 10 medium difficulty questions from my notes"
   - "Make a hard quiz about this content"

3. The AI will use the `generate_quiz_from_file` tool to:
   - Extract text from your file
   - Generate quiz questions based on the content

4. After questions are generated, the AI can use `create_quiz_json` to save them

5. Use `open_quiz_viewer` to take the quiz in your browser

### Available Tools

| Tool | Description |
|------|-------------|
| `generate_quiz_from_file` | Extract text and generate quiz questions from a file |
| `create_quiz_json` | Save generated quiz to JSON file |
| `open_quiz_viewer` | Open the interactive quiz viewer in browser |

### Configuration

Configure the plugin in LM Studio's plugin settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `questionCount` | number | 10 | Number of questions to generate (1-50) |
| `difficulty` | string | "medium" | Question difficulty: easy, medium, hard |
| `autoOpenQuiz` | boolean | true | Auto-open quiz viewer after generation |

## Quiz Viewer

The quiz viewer provides:

- 📊 **Progress Bar**: Track how many questions you've answered
- ⬅️➡️ **Navigation**: Move between questions
- 🎯 **Answer Selection**: Click to select from 4 options
- 📝 **Review**: See all questions with correct answers highlighted
- 🏆 **Score Display**: Get your percentage and total score

## Example Workflow

```
User: [attaches lecture.pdf] Can you make a quiz from this?

AI: I'll generate a quiz from lecture.pdf using the generate_quiz_from_file tool.
    [Tool call: extract text, generate questions]
    
AI: I've created 10 medium-difficulty questions about the lecture content.
    Would you like me to save this as a quiz you can take?

User: Yes please!

AI: [Tool call: create_quiz_json to save quiz.json]
    I've saved the quiz. Would you like to open it in the browser?

User: Open it!

AI: [Tool call: open_quiz_viewer]
    The quiz is now open in your browser. Good luck!
```

## Project Structure

```
lm_studio_quiz_maker/
├── manifest.json         # LM Studio plugin manifest
├── package.json          # Node.js dependencies
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── index.ts          # Plugin entry point
│   ├── configSchematics.ts  # Configuration schema
│   └── toolsProvider.ts  # Tool definitions
└── dist/                 # Compiled JavaScript (generated)
```

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Push to LM Studio Hub (requires authentication)
npm run push
```

## Requirements

- **LM Studio** v0.8.0 or higher
- **Node.js** v18 or higher
- A local LLM loaded in LM Studio (for quiz generation)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

**ViswaaTheMightyPickle**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Made with ❤️ using [LM Studio](https://lmstudio.ai/)
