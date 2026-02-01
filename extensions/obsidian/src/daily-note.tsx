import { closeMainWindow, open } from "@vicinae/api";

export default async function Command() {
  await closeMainWindow();
  await open("obsidian://daily");
}
