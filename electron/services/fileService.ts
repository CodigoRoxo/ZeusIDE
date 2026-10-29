import fs from 'node:fs/promises';
import path from 'node:path';
import { shell } from 'electron';

// Files above this size are not opened in the editor
const MAX_EDITABLE_SIZE = 5 * 1024 * 1024;
// How many leading bytes are scanned when sniffing for binary content
const BINARY_SNIFF_BYTES = 8000;
// Upper bound for the quick-open index, to stay responsive on huge folders
const MAX_LISTED_FILES = 20000;
// Folders skipped when indexing the project for quick open
const LIST_IGNORED_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'dist-electron', 'build', 'out', 'release',
  '.next', '.nuxt', '.cache', 'coverage', 'target', '__pycache__', '.venv', 'venv',
]);

export type ReadFileResult =
  | { ok: true; content: string }
  | { ok: false; reason: 'binary' | 'tooLarge'; size: number };

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  extension?: string;
  size?: number;
}

export class FileService {
  /**
   * Reads immediate children of a directory, sorted by folders first, then files alphabetically.
   */
  async readDirectory(dirPath: string): Promise<FileNode[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const nodes: FileNode[] = [];

      for (const entry of entries) {
        // Skip annoying system files or deep git internals
        if (entry.name === '.git' && entry.isDirectory()) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const isDir = entry.isDirectory();
        const ext = isDir ? undefined : path.extname(entry.name).toLowerCase();

        nodes.push({
          name: entry.name,
          path: fullPath,
          isDirectory: isDir,
          extension: ext,
        });
      }

      // Sort: folders first, then alphabetical
      nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      return nodes;
    } catch (error) {
      console.error(`Failed to read directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Lists every file under a folder (absolute paths), skipping build and dependency folders.
   */
  async listFiles(rootPath: string): Promise<string[]> {
    const files: string[] = [];
    const queue = [rootPath];

    while (queue.length > 0 && files.length < MAX_LISTED_FILES) {
      const dir = queue.shift() as string;
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        continue; // Unreadable folder (permissions, removed meanwhile)
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!LIST_IGNORED_DIRS.has(entry.name)) queue.push(fullPath);
        } else if (entry.isFile()) {
          files.push(fullPath);
          if (files.length >= MAX_LISTED_FILES) break;
        }
      }
    }

    return files;
  }

  async readFile(filePath: string): Promise<ReadFileResult> {
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_EDITABLE_SIZE) {
      return { ok: false, reason: 'tooLarge', size: stat.size };
    }

    const buffer = await fs.readFile(filePath);
    // A NUL byte near the start is a reliable sign of a binary file
    if (buffer.subarray(0, BINARY_SNIFF_BYTES).includes(0)) {
      return { ok: false, reason: 'binary', size: stat.size };
    }

    return { ok: true, content: buffer.toString('utf-8') };
  }

  async writeFile(filePath: string, content: string): Promise<boolean> {
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  }

  async createFile(filePath: string): Promise<boolean> {
    await fs.writeFile(filePath, '', 'utf-8');
    return true;
  }

  async createDirectory(dirPath: string): Promise<boolean> {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  }

  /**
   * Moves a file or folder to the system trash (Recycle Bin) so it can be restored.
   */
  async deleteItem(itemPath: string): Promise<boolean> {
    await shell.trashItem(path.normalize(itemPath));
    return true;
  }

  async renameItem(oldPath: string, newPath: string): Promise<boolean> {
    await fs.rename(oldPath, newPath);
    return true;
  }
}
