import os from "os";
import { spawnAsync } from "../code-util/spawn";
import { spawn } from "child_process";

export async function openUrl(url: string) {
  // NOTE1: `open` is buggy for Windows, where it expects some SYSTEMROOT var that is not defined somehow.
  if (!process.env.SYSTEMROOT) {
    if (process.env.windir) {
      process.env.SYSTEMROOT = process.env.windir;
    }
    else {
      // go by some heuristic?
      const driveLetter = process.env.TMP?.[0] || "C";
      process.env.SYSTEMROOT = `${driveLetter}:\\Windows`;
    }
  }
  // NOTE2: There is a compatability problem with open, requiring a dynamic import.
  const { openApp } = await import("open");

  await openApp(url);
}

export async function exec(url: string) {
  // Note: There is a compatability problem with open, requiring a dynamic import.
  const { openApp } = await import("open");
  await openApp(url);
}
