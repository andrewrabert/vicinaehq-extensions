import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { basename, join } from "path";
import { getPreferenceValues } from "@vicinae/api";
import type { Preferences } from "./types";

export interface Vault {
  id: string;
  path: string;
  name: string;
}

interface ObsidianConfig {
  vaults: Record<string, { path: string }>;
}

function getConfigPaths(): string[] {
  const home = homedir();
  return [
    join(home, ".config", "obsidian", "obsidian.json"),
    join(home, ".var", "app", "md.obsidian.Obsidian", "config", "obsidian", "obsidian.json"),
    join(home, "snap", "obsidian", "current", ".config", "obsidian", "obsidian.json"),
  ];
}

function loadConfig(): ObsidianConfig | null {
  const { vaultConfigPath } = getPreferenceValues<Preferences>();

  // If custom vault config path is set, use it
  if (vaultConfigPath && vaultConfigPath.trim()) {
    const customPath = join(vaultConfigPath.trim(), "obsidian.json");
    if (existsSync(customPath)) {
      try {
        const content = readFileSync(customPath, "utf-8");
        return JSON.parse(content) as ObsidianConfig;
      } catch {
        // Fall through to auto-detection
      }
    }
  }

  // Auto-detection fallback
  for (const configPath of getConfigPaths()) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        return JSON.parse(content) as ObsidianConfig;
      } catch {
        // Try next path
      }
    }
  }
  return null;
}

export function getVaults(): Vault[] {
  const config = loadConfig();
  if (!config || !config.vaults) {
    return [];
  }

  const { excludedVaults } = getPreferenceValues<Preferences>();
  const excludedSet = new Set(
    (excludedVaults || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  );

  return Object.entries(config.vaults)
    .filter(([, data]) => data.path && existsSync(data.path))
    .map(([id, data]) => ({
      id,
      path: data.path,
      name: basename(data.path),
    }))
    .filter((vault) => !excludedSet.has(vault.name));
}
