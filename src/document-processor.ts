import { readFile, writeFile, mkdir, readdir, stat } from "fs/promises";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import path from "path";

export interface ProcessedDocument {
  originalPath: string;
  fileName: string;
  baseName: string;
  markdownPath: string;
  chunksPath: string;
  totalChunks: number;
}

/**
 * Convert various file formats to markdown
 */
export async function convertToMarkdown(filePath: string, outputDir: string): Promise<ProcessedDocument> {
  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const fileName = path.basename(absolutePath);
  const baseName = path.basename(absolutePath, ext);
  
  // Create output directory structure
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");
  const docDir = path.join(outputDir, safeBaseName);
  const chunksDir = path.join(docDir, "chunks");
  const markdownPath = path.join(docDir, `${safeBaseName}.md`);
  
  await mkdir(chunksDir, { recursive: true });
  
  let content: string;
  
  switch (ext) {
    case ".txt":
    case ".md":
    case ".text":
      content = await readFile(absolutePath, "utf-8");
      // If it's already markdown, just copy it
      if (ext === ".md") {
        await writeFile(markdownPath, content, "utf-8");
      } else {
        // Convert TXT to markdown with basic formatting
        const mdContent = convertTextToMarkdown(content);
        await writeFile(markdownPath, mdContent, "utf-8");
      }
      break;
      
    case ".pdf": {
      const pdfBuffer = await readFile(absolutePath);
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      const mdContent = convertTextToMarkdown(result.text);
      await writeFile(markdownPath, mdContent, "utf-8");
      break;
    }
    
    case ".docx": {
      const docxBuffer = await readFile(absolutePath);
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      const mdContent = convertTextToMarkdown(result.value);
      await writeFile(markdownPath, mdContent, "utf-8");
      break;
    }
    
    default:
      throw new Error(`Unsupported file type: ${ext}. Supported: .txt, .md, .pdf, .docx`);
  }
  
  // Create chunks from the markdown file
  const chunks = await chunkDocument(markdownPath, chunksDir);
  
  return {
    originalPath: absolutePath,
    fileName,
    baseName: safeBaseName,
    markdownPath,
    chunksPath: chunksDir,
    totalChunks: chunks,
  };
}

/**
 * Convert plain text to markdown with basic formatting
 */
function convertTextToMarkdown(text: string): string {
  const lines = text.split("\n");
  const mdLines: string[] = [];
  let inCodeBlock = false;
  let listLevel = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect code blocks
    if (trimmed.startsWith("```") || (trimmed.match(/^\s*(function|const|let|var|import|export|class|if|for|while)/) && !inCodeBlock)) {
      if (!inCodeBlock) {
        mdLines.push("```");
        inCodeBlock = true;
      }
    }
    
    // Detect headings (lines that look like section headers)
    if (trimmed.length > 0 && trimmed.length < 100 && !trimmed.endsWith(".") && /^[A-Z][a-zA-Z\s]+$/.test(trimmed)) {
      mdLines.push(`\n## ${trimmed}\n`);
      continue;
    }
    
    // Detect lists
    if (trimmed.match(/^[-•*]\s/) || trimmed.match(/^\d+\.\s/)) {
      mdLines.push(`- ${trimmed.replace(/^[-•*]\s|^\d+\.\s/, "")}`);
      continue;
    }
    
    // Regular paragraphs
    if (trimmed.length > 0) {
      mdLines.push(trimmed);
    } else if (mdLines.length > 0 && mdLines[mdLines.length - 1] !== "") {
      mdLines.push("");
    }
  }
  
  if (inCodeBlock) {
    mdLines.push("```");
  }
  
  return mdLines.join("\n");
}

/**
 * Chunk a markdown document into smaller pieces for RAG
 * Each chunk is approximately 2000-3000 characters
 */
async function chunkDocument(markdownPath: string, chunksDir: string): Promise<number> {
  const content = await readFile(markdownPath, "utf-8");
  const chunks = splitIntoChunks(content, 2500);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = path.join(chunksDir, `chunk_${String(i + 1).padStart(3, "0")}.md`);
    const chunkContent = `---
chunk: ${i + 1}
total: ${chunks.length}
---

${chunks[i]}`;
    await writeFile(chunkPath, chunkContent, "utf-8");
  }
  
  return chunks.length;
}

/**
 * Split text into chunks while preserving section boundaries
 */
function splitIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sections = text.split(/\n(?=##)/);
  
  let currentChunk = "";
  
  for (const section of sections) {
    if (currentChunk.length + section.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = section;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + section;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If any chunk is still too large, split it further
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > maxChunkSize * 1.5) {
      const paragraphs = chunk.split("\n\n");
      let subChunk = "";
      for (const para of paragraphs) {
        if (subChunk.length + para.length > maxChunkSize && subChunk.length > 0) {
          finalChunks.push(subChunk.trim());
          subChunk = para;
        } else {
          subChunk += (subChunk ? "\n\n" : "") + para;
        }
      }
      if (subChunk.trim()) {
        finalChunks.push(subChunk.trim());
      }
    } else {
      finalChunks.push(chunk);
    }
  }
  
  return finalChunks;
}

/**
 * List all processed documents in a directory
 */
export async function listProcessedDocuments(baseDir: string): Promise<ProcessedDocument[]> {
  const documents: ProcessedDocument[] = [];
  
  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const docDir = path.join(baseDir, entry.name);
      const markdownFile = path.join(docDir, `${entry.name}.md`);
      const chunksDir = path.join(docDir, "chunks");
      
      try {
        await stat(markdownFile);
        const chunkFiles = await readdir(chunksDir);
        const chunkCount = chunkFiles.filter(f => f.endsWith(".md")).length;
        
        documents.push({
          originalPath: "",
          fileName: entry.name,
          baseName: entry.name,
          markdownPath: markdownFile,
          chunksPath: chunksDir,
          totalChunks: chunkCount,
        });
      } catch {
        // Not a valid processed document directory
      }
    }
  } catch {
    // Directory doesn't exist yet
  }
  
  return documents;
}

/**
 * Read all chunks from a processed document
 */
export async function readDocumentChunks(doc: ProcessedDocument): Promise<string[]> {
  const chunkFiles = await readdir(doc.chunksPath);
  const chunks: string[] = [];
  
  const sortedFiles = chunkFiles
    .filter(f => f.endsWith(".md"))
    .sort();
  
  for (const file of sortedFiles) {
    const content = await readFile(path.join(doc.chunksPath, file), "utf-8");
    // Remove frontmatter
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n\n/, "");
    chunks.push(withoutFrontmatter);
  }
  
  return chunks;
}
