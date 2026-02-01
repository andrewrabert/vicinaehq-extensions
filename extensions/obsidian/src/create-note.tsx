import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getPreferenceValues,
  open,
  showToast,
  Toast,
} from "@vicinae/api";
import { useEffect, useState } from "react";

import { getVaults, Vault } from "./obsidian";
import { Preferences } from "./types";
import { createNoteUri } from "./utils";

export default function Command() {
  const { defaultVault } = getPreferenceValues<Preferences>();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVault, setSelectedVault] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const foundVaults = getVaults();
      if (foundVaults.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Obsidian vaults found",
        });
        setIsLoading(false);
        return;
      }

      setVaults(foundVaults);

      // Set default vault
      if (defaultVault) {
        const found = foundVaults.find((v) => v.name === defaultVault);
        if (found) {
          setSelectedVault(found.id);
        } else {
          setSelectedVault(foundVaults[0].id);
        }
      } else {
        setSelectedVault(foundVaults[0].id);
      }

      setIsLoading(false);
    })();
  }, []);

  async function handleSubmit(values: Form.Values) {
    const noteName = values.noteName as string;
    const vault = values.vault as string;

    if (!noteName?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Note name required",
      });
      return;
    }

    const uri = createNoteUri(vault, noteName.trim());
    await closeMainWindow();
    await open(uri);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="noteName"
        title="Note Name"
        autoFocus
      />
      <Form.Dropdown
        id="vault"
        title="Vault"
        value={selectedVault}
        onChange={setSelectedVault}
      >
        {vaults.map((vault) => (
          <Form.Dropdown.Item key={vault.id} value={vault.id} title={vault.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
