import { readFile, writeFile, access } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Quiz HTML template with embedded JavaScript for interactivity
 */
const QUIZ_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 700px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 1.8rem;
    }
    .meta {
      color: #666;
      margin-bottom: 25px;
      font-size: 0.9rem;
    }
    .progress {
      background: #e0e0e0;
      border-radius: 8px;
      height: 8px;
      margin-bottom: 25px;
      overflow: hidden;
    }
    .progress-bar {
      background: linear-gradient(90deg, #667eea, #764ba2);
      height: 100%;
      transition: width 0.3s ease;
    }
    .question-container { display: none; }
    .question-container.active { display: block; }
    .question-number {
      color: #667eea;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .question-text {
      font-size: 1.2rem;
      color: #333;
      margin-bottom: 25px;
      line-height: 1.5;
    }
    .options { list-style: none; }
    .option {
      background: #f8f9fa;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      padding: 15px 20px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .option:hover {
      border-color: #667eea;
      background: #f0f0ff;
    }
    .option.selected {
      border-color: #667eea;
      background: #667eea;
      color: white;
    }
    .option input { display: none; }
    .option label {
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    .option-letter {
      font-weight: bold;
      margin-right: 12px;
      min-width: 28px;
    }
    .nav-buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      gap: 15px;
    }
    button {
      padding: 12px 30px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-prev {
      background: #e0e0e0;
      color: #333;
    }
    .btn-prev:hover { background: #d0d0d0; }
    .btn-prev:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-next, .btn-submit {
      background: linear-gradient(90deg, #667eea, #764ba2);
      color: white;
    }
    .btn-next:hover, .btn-submit:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }
    .results {
      display: none;
      text-align: center;
    }
    .results.active { display: block; }
    .score-circle {
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;
      color: white;
    }
    .score-number {
      font-size: 3rem;
      font-weight: bold;
    }
    .score-label { font-size: 0.9rem; opacity: 0.9; }
    .review {
      text-align: left;
      margin-top: 30px;
    }
    .review-item {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 15px;
    }
    .review-item.correct { border-left: 4px solid #4caf50; }
    .review-item.incorrect { border-left: 4px solid #f44336; }
    .review-question {
      font-weight: 600;
      margin-bottom: 10px;
      color: #333;
    }
    .review-answer {
      padding: 8px 12px;
      border-radius: 6px;
      margin: 5px 0;
      font-size: 0.9rem;
    }
    .review-answer.correct { background: #e8f5e9; color: #2e7d32; }
    .review-answer.incorrect { background: #ffebee; color: #c62828; }
    .review-answer.selected { font-weight: 600; }
    .btn-restart {
      margin-top: 20px;
      background: #333;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="quiz-content">
      <h1 id="quiz-title">Loading...</h1>
      <p class="meta" id="quiz-meta"></p>
      <div class="progress"><div class="progress-bar" id="progress-bar"></div></div>
      <div id="questions-container"></div>
      <div class="nav-buttons" id="nav-buttons">
        <button class="btn-prev" id="btn-prev" disabled>← Previous</button>
        <button class="btn-next" id="btn-next">Next →</button>
      </div>
    </div>
    <div class="results" id="results">
      <div class="score-circle">
        <span class="score-number" id="score-number">0%</span>
        <span class="score-label" id="score-label">0 / 0</span>
      </div>
      <h2>Quiz Complete!</h2>
      <p class="meta" id="results-message"></p>
      <div class="review" id="review-container"></div>
      <button class="btn-restart" onclick="location.reload()">Restart Quiz</button>
    </div>
  </div>

  <script>
    const quizData = ___QUIZ_DATA___;
    let currentQuestion = 0;
    let answers = new Array(quizData.questions.length).fill(null);

    function renderQuestions() {
      const container = document.getElementById('questions-container');
      container.innerHTML = quizData.questions.map((q, i) => \`
        <div class="question-container \${i === currentQuestion ? 'active' : ''}" data-index="\${i}">
          <div class="question-number">Question \${i + 1} of \${quizData.totalQuestions}</div>
          <div class="question-text">\${escapeHtml(q.question)}</div>
          <ul class="options">
            \${q.options.map(opt => \`
              <li class="option \${answers[i] === opt.id ? 'selected' : ''}" data-option="\${opt.id}" onclick="selectOption(\${i}, '\${opt.id}')">
                <label>
                  <span class="option-letter">\${opt.id.toUpperCase()}.</span>
                  <span>\${escapeHtml(opt.text)}</span>
                </label>
              </li>
            \`).join('')}
          </ul>
        </div>
      \`).join('');
    }

    function selectOption(questionIndex, optionId) {
      answers[questionIndex] = optionId;
      renderQuestions();
      updateProgress();
    }

    function updateProgress() {
      const answered = answers.filter(a => a !== null).length;
      const pct = (answered / quizData.totalQuestions) * 100;
      document.getElementById('progress-bar').style.width = pct + '%';
    }

    function updateButtons() {
      document.getElementById('btn-prev').disabled = currentQuestion === 0;
      const nextBtn = document.getElementById('btn-next');
      if (currentQuestion === quizData.totalQuestions - 1) {
        nextBtn.textContent = 'Submit Quiz';
        nextBtn.className = 'btn-submit';
      } else {
        nextBtn.textContent = 'Next →';
        nextBtn.className = 'btn-next';
      }
    }

    function navigate(direction) {
      if (direction === 'next') {
        if (currentQuestion < quizData.totalQuestions - 1) {
          currentQuestion++;
        } else {
          submitQuiz();
          return;
        }
      } else if (currentQuestion > 0) {
        currentQuestion--;
      }
      renderQuestions();
      updateButtons();
    }

    function submitQuiz() {
      const unanswered = answers.filter(a => a === null).length;
      if (unanswered > 0 && !confirm(\`You have \${unanswered} unanswered question(s). Submit anyway?\`)) {
        return;
      }

      let correct = 0;
      quizData.questions.forEach((q, i) => {
        if (answers[i] === q.correctAnswer) correct++;
      });

      const percentage = Math.round((correct / quizData.totalQuestions) * 100);
      document.getElementById('score-number').textContent = percentage + '%';
      document.getElementById('score-label').textContent = \`\${correct} / \${quizData.totalQuestions}\`;

      const message = percentage >= 80 ? '🎉 Excellent work!' :
                      percentage >= 60 ? '👍 Good effort!' :
                      '📚 Keep studying!';
      document.getElementById('results-message').textContent = message;

      // Render review
      const reviewContainer = document.getElementById('review-container');
      reviewContainer.innerHTML = quizData.questions.map((q, i) => {
        const isCorrect = answers[i] === q.correctAnswer;
        const selectedOption = q.options.find(o => o.id === answers[i]);
        const correctOption = q.options.find(o => o.id === q.correctAnswer);
        return \`
          <div class="review-item \${isCorrect ? 'correct' : 'incorrect'}">
            <div class="review-question">\${i + 1}. \${escapeHtml(q.question)}</div>
            \${selectedOption ? \`
              <div class="review-answer \${isCorrect ? 'correct' : 'incorrect'} selected">
                Your answer: \${selectedOption.id.toUpperCase()}. \${escapeHtml(selectedOption.text)}
              </div>
            \`: '<div class="review-answer incorrect">No answer selected</div>'}
            \${!isCorrect ? \`
              <div class="review-answer correct">
                Correct answer: \${correctOption.id.toUpperCase()}. \${escapeHtml(correctOption.text)}
              </div>
            \`: ''}
          </div>
        \`;
      }).join('');

      document.getElementById('quiz-content').style.display = 'none';
      document.getElementById('nav-buttons').style.display = 'none';
      document.getElementById('results').classList.add('active');
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Initialize
    document.getElementById('quiz-title').textContent = quizData.title;
    document.getElementById('quiz-meta').textContent = \`Source: \${quizData.sourceFile}\`;
    renderQuestions();
    updateButtons();
    updateProgress();

    document.getElementById('btn-prev').addEventListener('click', () => navigate('prev'));
    document.getElementById('btn-next').addEventListener('click', () => navigate('next'));
  </script>
</body>
</html>`;

async function main() {
  const quizPath = path.join(process.cwd(), "quiz.json");

  try {
    // Check if quiz.json exists
    await access(quizPath);
  } catch {
    console.error("❌ No quiz.json found!");
    console.error("\nGenerate a quiz first by running:");
    console.error("   npm run generate -- <your-file.pdf>\n");
    process.exit(1);
  }

  try {
    // Read quiz data
    const quizData = await readFile(quizPath, "utf-8");
    const quiz = JSON.parse(quizData);

    // Embed quiz data into HTML template
    const html = QUIZ_TEMPLATE.replace("___QUIZ_DATA___", quizData);

    // Write HTML file
    const htmlPath = path.join(__dirname, "quiz.html");
    await writeFile(htmlPath, html);

    console.log("\n🎯 Opening quiz in browser...\n");

    // Open in default browser
    const openCommand = process.platform === "darwin" ? "open" :
                        process.platform === "win32" ? "start" : "xdg-open";

    await execAsync(`${openCommand} "${htmlPath}"`);
    console.log("✅ Quiz opened successfully!\n");

  } catch (error) {
    console.error("❌ Error:", (error as Error).message);
    process.exit(1);
  }
}

main();
