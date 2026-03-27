import { readFile } from "fs/promises";
import path from "path";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { listQuizDirectories, loadQuizFromDirectory } from "./quiz-generator.js";

const PORT = 3456;

/**
 * Get the directory where this script is located
 */
function getScriptDir(): string {
  return __dirname;
}

/**
 * Quiz Server - serves the quiz viewer UI and provides API endpoints
 */
export async function startQuizServer(quizBaseDir: string): Promise<void> {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    // API: List available quizzes
    if (url.pathname === '/api/quizzes' && req.method === 'GET') {
      try {
        const dirs = await listQuizDirectories(quizBaseDir);
        const quizzes = await Promise.all(
          dirs.map(async (dir) => {
            const quiz = await loadQuizFromDirectory(path.join(quizBaseDir, dir));
            return {
              name: dir,
              path: path.join(quizBaseDir, dir),
              questionCount: quiz?.totalQuestions || 0,
              title: quiz?.title || dir,
            };
          })
        );
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(quizzes));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to list quizzes' }));
      }
      return;
    }

    // API: Load specific quiz
    if (url.pathname === '/api/quiz' && req.method === 'GET') {
      const quizPath = url.searchParams.get('path');
      if (!quizPath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing path parameter' }));
        return;
      }

      try {
        const quiz = await loadQuizFromDirectory(quizPath);
        if (!quiz) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Quiz not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(quiz));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load quiz' }));
      }
      return;
    }

    // Serve the quiz viewer HTML
    if (url.pathname === '/' || url.pathname === '/index.html') {
      try {
        const htmlPath = path.join(getScriptDir(), 'quiz-viewer.html');
        const html = await readFile(htmlPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>Failed to load quiz viewer</p>');
      }
      return;
    }

    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(PORT, () => {
      console.log(`\n🌐 Quiz Viewer Server running at http://localhost:${PORT}`);
      console.log(`   Serving quizzes from: ${quizBaseDir}\n`);
      resolve();
    });
  });
}
