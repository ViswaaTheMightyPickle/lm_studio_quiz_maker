# LM Studio Quiz Maker

🤖 AI-powered quiz generator that creates multiple-choice quizzes from your study materials using LM Studio.

## Features

- 📄 **Multiple File Formats**: Support for PDF, DOCX, TXT, and MD files
- 🧠 **AI-Generated Questions**: Uses LM Studio to create intelligent quiz questions
- ✅ **4-Option Multiple Choice**: Each question has 4 answers with 1 correct option
- 🌐 **Browser-Based Quiz UI**: Clean, interactive interface for taking quizzes
- 📊 **Instant Results**: Get your score and review answers immediately

## Prerequisites

1. **Node.js** (v18 or higher)
2. **LM Studio** - Download from [lmstudio.ai](https://lmstudio.ai/)
3. **LM Studio Local Server** must be running

## Installation

```bash
npm install
```

## Usage

### 1. Start LM Studio Server

```bash
lms server start
```

Make sure you have a model loaded in LM Studio.

### 2. Generate a Quiz

```bash
# Single file
npm run generate -- ./study-notes.pdf

# Multiple files
npm run generate -- ./chapter1.pdf ./chapter2.pdf

# Custom number of questions
npm run generate -- ./notes.pdf -n 15

# Text/markdown files
npm run generate -- ./readings/*.txt
```

**Supported formats:** `.txt`, `.md`, `.pdf`, `.docx`

### 3. Take the Quiz

```bash
npm run view
```

This opens the quiz in your default browser with:
- One question at a time
- Progress tracking
- Submit button with confirmation
- Score display with percentage
- Full review of all questions

## Output

Generated quizzes are saved as `quiz.json`:

```json
{
  "title": "Introduction to Machine Learning",
  "sourceFile": "ml-notes.pdf",
  "totalQuestions": 10,
  "questions": [
    {
      "id": 1,
      "question": "What is supervised learning?",
      "options": [
        {"id": "a", "text": "Learning with labeled data"},
        {"id": "b", "text": "Learning without any data"},
        {"id": "c", "text": "Learning with unlabeled data"},
        {"id": "d", "text": "Learning from rewards"}
      ],
      "correctAnswer": "a"
    }
  ]
}
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run generate -- <file>` | Generate quiz from file(s) |
| `npm run view` | Open quiz in browser |
| `npm run build` | Compile TypeScript |
| `npm run clean` | Remove dist folder |

## Project Structure

```
lm_studio_quiz_maker/
├── src/
│   ├── index.ts           # Main CLI entry point
│   ├── file-processor.ts  # File reading & text extraction
│   ├── quiz-generator.ts  # AI quiz generation logic
│   └── viewer.ts          # Browser quiz launcher
├── dist/                  # Compiled JavaScript
├── quiz.json              # Generated quiz output
├── package.json
└── agents.md              # Development plan
```

## Example Workflow

```bash
# Generate a 20-question quiz from your lecture notes
npm run generate -- ./lecture-notes.pdf -n 20

# Take the quiz
npm run view

# Generate another quiz from multiple sources
npm run generate -- ./chapter1.pdf ./chapter2.pdf ./summary.md

# View the new quiz
npm run view
```

## Troubleshooting

**"No questions were generated"**
- Ensure your file has sufficient text content
- Try a different file format (TXT/MD work best)
- Check that LM Studio has a model loaded

**"Failed to parse AI response"**
- The AI output wasn't valid JSON - try regenerating
- Ensure your LM Studio model supports instruction following

**"LM Studio connection failed"**
- Run `lms server start` to start the local server
- Check that the server is accessible

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
