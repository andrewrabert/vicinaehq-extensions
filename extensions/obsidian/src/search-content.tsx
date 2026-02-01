import {
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  open,
  showInFileBrowser,
  showToast,
  Toast,
} from "@vicinae/api";
import { readFileSync } from "fs";
import { useEffect, useMemo, useState } from "react";

import { getVaults } from "./obsidian";
import { Preferences } from "./types";
import { indexNotes, Note, openNoteUri, openVaultUri } from "./utils";

interface NoteWithContent extends Note {
  content: string;
  matchLine?: string;
  lineNumber?: number;
}

function searchContent(notes: Note[], query: string): NoteWithContent[] {
  if (!query.trim()) return [];

  const results: NoteWithContent[] = [];
  const lowerQuery = query.toLowerCase();

  for (const note of notes) {
    try {
      const content = readFileSync(note.path, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lowerQuery)) {
          results.push({
            ...note,
            content,
            matchLine: lines[i].trim(),
            lineNumber: i + 1,
          });
          break;
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return results;
}

export default function Command() {
  const { maxResults, excludedFolders } = getPreferenceValues<Preferences>();
  const maxResultsNum = parseInt(maxResults) || 100;

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const foundVaults = getVaults();
        if (foundVaults.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No Obsidian vaults found",
            message: "Make sure Obsidian is installed and has at least one vault",
          });
          setIsLoading(false);
          return;
        }

        const indexedNotes = indexNotes(foundVaults, excludedFolders);
        setNotes(indexedNotes);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading notes",
          message: String(error),
        });
      }
      setIsLoading(false);
    })();
  }, []);

  const results = useMemo(() => {
    return searchContent(notes, query).slice(0, maxResultsNum);
  }, [notes, query, maxResultsNum]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search note contents..."
      onSearchTextChange={setQuery}
    >
      {results.map((note, idx) => (
        <List.Item
          key={`${note.path}-${idx}`}
          icon={Icon.Document}
          title={note.title}
          subtitle={note.matchLine}
          accessories={[
            { text: `L${note.lineNumber}` },
            { text: note.vault.name },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Obsidian"
                icon={Icon.Window}
                onAction={() => {
                  closeMainWindow();
                  open(openNoteUri(note.vault.id, note.relativePath));
                }}
                shortcut={{ modifiers: [], key: "enter" }}
              />
              <Action
                title="Open Vault"
                icon={Icon.Folder}
                onAction={() => {
                  closeMainWindow();
                  open(openVaultUri(note.vault.id));
                }}
                shortcut={{ modifiers: ["shift"], key: "enter" }}
              />
              <Action
                title="Show in File Manager"
                icon={Icon.Folder}
                onAction={() => {
                  closeMainWindow();
                  showInFileBrowser(note.path);
                }}
                shortcut={{ modifiers: ["ctrl"], key: "o" }}
              />
              <Action.CopyToClipboard
                title="Copy Path"
                content={note.path}
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && query && results.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches found"
          description="Try a different search term"
        />
      )}
      {!isLoading && !query && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search note contents"
          description="Type to search within your notes"
        />
      )}
    </List>
  );
}
