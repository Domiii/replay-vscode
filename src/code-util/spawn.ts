/* Copyright 2023 Record Replay Inc. */

import { spawn, SpawnOptions, SpawnOptionsWithoutStdio } from "child_process";
import { runTaskWithProgressBar } from "../code-ui/progressBar";
import { streamToLineIterator } from "../util/streams";
import { showInformationMessage } from "./codeModals";

export async function spawnAsync(
  spawnArgs: {
    command: string,
    args?: ReadonlyArray<string>,
    options?: SpawnOptionsWithoutStdio,
    title?: string,
    successMessage?: string,
  }
) {
  const { command, args, options, title, successMessage } = spawnArgs;
  const process = spawn(command, args, options);
    
  let code: number | null = null, signal: string | null = null;
  let errorOut: string | null = null;
  await runTaskWithProgressBar(async (progress) => {
    await Promise.all([
      process.stdout ? (async () => {
        for await (const line of streamToLineIterator(process.stdout)) {
          progress.report({ message: line });
        }
      })() : null,
      process.stdout ? (async () => {
        errorOut = "";
        for await (const line of streamToLineIterator(process.stdout)) {
          progress.report({ message: line });
          errorOut += line + "\n";
        }
      })() : null,
      new Promise<void>((resolve, reject) => {
        process.on("error", reject);
        process.on("exit", (_code, _signal) => void (code = _code, signal = _signal, resolve()));
      }),
    ]);
  }, { title });
  if (code || signal) {
    throw new Error(`Process failed code=${code}, signal=${signal} - ERROR: ${(errorOut as string | null)?.trim() || ""}`);
  }
  if (successMessage) {
    showInformationMessage(successMessage);
  }
}
