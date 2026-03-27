import { readFile } from "fs/promises";
import path from "path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export interface ProcessedFile {
  filePath: string;
  fileName: string;
  content: string;
  fileType: string;
}

/**
 * Process a file and extract text content based on file type
 */
export async function processFile(filePath: string): Promise<ProcessedFile> {
  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const fileName = path.basename(absolutePath);

  let content: string;

  switch (ext) {
    case ".txt":
    case ".md":
    case ".text":
      content = await readFile(absolutePath, "utf-8");
      break;

    case ".pdf": {
      const pdfBuffer = await readFile(absolutePath);
      const parser = new PDFParse({ data: pdfBuffer });
      const pdfData = await parser.getText();
      content = pdfData.text;
      break;
    }

    case ".docx": {
      const docxBuffer = await readFile(absolutePath);
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      content = result.value;
      if (result.messages.length > 0) {
        console.warn("DOCX extraction warnings:", result.messages);
      }
      break;
    }

    default:
      throw new Error(
        `Unsupported file type: ${ext}. Supported: .txt, .md, .pdf, .docx`
      );
  }

  if (!content || content.trim().length === 0) {
    throw new Error(`File appears to be empty: ${fileName}`);
  }

  return {
    filePath: absolutePath,
    fileName,
    content: content.trim(),
    fileType: ext.slice(1),
  };
}

/**
 * Process multiple files and combine their content
 */
export async function processFiles(filePaths: string[]): Promise<ProcessedFile[]> {
  const results: ProcessedFile[] = [];

  for (const filePath of filePaths) {
    try {
      const processed = await processFile(filePath);
      results.push(processed);
      console.log(`✓ Processed: ${processed.fileName} (${processed.content.length} chars)`);
    } catch (error) {
      console.error(`✗ Failed to process ${filePath}:`, (error as Error).message);
      throw error;
    }
  }

  return results;
}

/**
 * Combine multiple processed files into a single text
 */
export function combineContent(files: ProcessedFile[]): string {
  return files
    .map((file) => `---\nSource: ${file.fileName}\n---\n\n${file.content}`)
    .join("\n\n");
}
