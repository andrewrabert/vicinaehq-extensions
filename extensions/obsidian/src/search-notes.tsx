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
import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";

import { getVaults, Vault } from "./obsidian";
import { Preferences } from "./types";
import { indexNotes, Note, openNoteUri, openVaultUri, createNoteUri } from "./utils";

export default function Command() {
  const { maxResults, searchThreshold, defaultVault, excludedFolders } = getPreferenceValues<Preferences>();
  const maxResultsNum = parseInt(maxResults) || 100;
  const searchThresholdNum = parseFloat(searchThreshold) || 0.4;

  const [notes, setNotes] = useState<Note[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
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

        setVaults(foundVaults);
        const indexedNotes = indexNotes(foundVaults, excludedFolders);
        setNotes(indexedNotes);

        await showToast({
          style: Toast.Style.Success,
          title: `Found ${indexedNotes.length} notes in ${foundVaults.length} vault${foundVaults.length > 1 ? "s" : ""}`,
        });
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

  const fuse = useMemo(() => {
    return new Fuse(notes, {
      keys: ["title", "relativePath"],
      threshold: searchThresholdNum,
    });
  }, [notes, searchThresholdNum]);

  const filteredNotes = useMemo(() => {
    if (!query.trim()) {
      return notes.slice(0, maxResultsNum);
    }
    return fuse.search(query).slice(0, maxResultsNum).map((result) => result.item);
  }, [notes, query, fuse, maxResultsNum]);

  const showCreateNote = query.trim() && filteredNotes.length === 0 && vaults.length > 0;

  // Find vault for creating notes: use defaultVault preference or fall back to first vault
  const targetVault = useMemo(() => {
    if (vaults.length === 0) return null;
    if (defaultVault) {
      const found = vaults.find((v) => v.name === defaultVault);
      if (found) return found;
    }
    return vaults[0];
  }, [vaults, defaultVault]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Obsidian notes..."
      onSearchTextChange={setQuery}
    >
      {showCreateNote && targetVault && (
        <List.Item
          icon={Icon.Plus}
          title={`Create "${query}"`}
          subtitle={`in ${targetVault.name}`}
          actions={
            <ActionPanel>
              <Action
                title="Create Note"
                icon={Icon.Plus}
                onAction={() => {
                  closeMainWindow();
                  open(createNoteUri(targetVault.id, query));
                }}
                shortcut={{ modifiers: [], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      )}
      {filteredNotes.map((note) => (
        <List.Item
          key={note.path}
          icon={Icon.Document}
          title={note.title}
          subtitle={note.vault.name}
          accessories={[{ text: note.relativePath }]}
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
      {!isLoading && notes.length === 0 && !showCreateNote && (
        <List.EmptyView
          icon={Icon.Warning}
          title="No notes found"
          description="Make sure Obsidian is installed and has vaults with notes"
        />
      )}
    </List>
  );
}
