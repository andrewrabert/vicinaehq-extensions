import {
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  open,
} from "@vicinae/api";
import { useState } from "react";
import { Preferences } from "./types";

export default function Command() {
  const { dailyNotePrefix } = getPreferenceValues<Preferences>();
  const prefix = dailyNotePrefix ?? "- [ ] ";
  const [query, setQuery] = useState("");

  async function addToDaily() {
    if (!query.trim()) return;

    const formatted = prefix + query.trim();
    const uri = `obsidian://adv-uri?daily=true&data=${encodeURIComponent(formatted)}&mode=append`;

    await closeMainWindow();
    await open(uri);
  }

  return (
    <List
      searchBarPlaceholder="Add to daily note..."
      onSearchTextChange={setQuery}
    >
      {query.trim() && (
        <List.Item
          icon={Icon.Plus}
          title={query}
          subtitle={`${prefix}${query}`}
          actions={
            <ActionPanel>
              <Action
                title="Add to Daily Note"
                icon={Icon.Plus}
                onAction={addToDaily}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
