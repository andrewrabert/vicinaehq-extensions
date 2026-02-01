import { readdirSync, statSync } from "fs";
import { join, relative } from "path";
import type { Vault } from "./obsidian";

export interface Note {
  title: string;
  path: string;
  relativePath: string;
  vault: Vault;
}

function walkDir(dir: string, fileList: string[] = [], excludedFolders: Set<string> = new Set()): string[] {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    try {
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        // Skip hidden directories, .obsidian config, and excluded folders
        if (!file.startsWith(".") && !excludedFolders.has(file)) {
          walkDir(filePath, fileList, excludedFolders);
        }
      } else if (file.endsWith(".md")) {
        fileList.push(filePath);
      }
    } catch {
      // Skip inaccessible files
    }
  }
  return fileList;
}

export function indexNotes(vaults: Vault[], excludedFolders?: string): Note[] {
  const notes: Note[] = [];
  const excludedSet = excludedFolders
    ? new Set(excludedFolders.split(",").map((f) => f.trim()).filter(Boolean))
    : new Set<string>();

  for (const vault of vaults) {
    const mdFiles = walkDir(vault.path, [], excludedSet);
    for (const filePath of mdFiles) {
      const relativePath = relative(vault.path, filePath);
      const title = relativePath.replace(/\.md$/, "").split("/").pop() || relativePath;
      notes.push({
        title,
        path: filePath,
        relativePath,
        vault,
      });
    }
  }

  return notes;
}

function percentEncode(str: string): string {
  return encodeURIComponent(str);
}

export function openNoteUri(vaultId: string, relativePath: string): string {
  return `obsidian://open?vault=${percentEncode(vaultId)}&file=${percentEncode(relativePath)}`;
}

export function openVaultUri(vaultId: string): string {
  return `obsidian://open?vault=${percentEncode(vaultId)}`;
}

export function createNoteUri(vaultId: string, name: string): string {
  return `obsidian://new?vault=${percentEncode(vaultId)}&name=${percentEncode(name)}`;
}
