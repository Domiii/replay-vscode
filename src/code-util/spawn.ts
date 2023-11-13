/* Copyright 2023 Record Replay Inc. */

import { spawn, SpawnOptions, SpawnOptionsWithoutStdio } from "child_process";
import { runTaskWithProgressBar } from "../code-ui/progressBar";
import { streamToLineIterator } from "../util/streams";
import { showInformationMessage } from "./codeModals";

export async function spawnAsync(spawnArgs: {
  command: string;
  args?: ReadonlyArray<string>;
  options?: SpawnOptionsWithoutStdio;
  title?: string;
  successMessage?: string;
  cancellable?: boolean;
  dontShowUpdates?: boolean;
}) {
  const {
    command,
    args,
    options,
    title,
    successMessage,
    cancellable,
    dontShowUpdates,
  } = spawnArgs;
  console.debug(
    `$ ${command} ${args?.map((arg) => `"${arg}"`).join(" ") || ""}`
  );
  const process = spawn(command, args, options);

  let code: number | null = null,
    signal: string | null = null;
  const errorOut: string[] = [];
  let cancelled = false;
  await runTaskWithProgressBar(
    async (progress, cancellationToken) => {
      cancellationToken.onCancellationRequested((e) => {
        cancelled = true;
        process.kill();
      });
      await Promise.all([
        process.stdout
          ? (async () => {
              for await (const line of streamToLineIterator(process.stdout)) {
                console.debug(`> ${line}`);
                if (!dontShowUpdates) {
                  progress.report({ message: line });
                }
              }
            })()
          : null,
        process.stdout
          ? (async () => {
              for await (const line of streamToLineIterator(process.stdout)) {
                console.error(`> ${line}`);
                if (!dontShowUpdates) {
                  progress.report({ message: line });
                }
                errorOut.push(line);
              }
            })()
          : null,
        new Promise<void>((resolve, reject) => {
          process.on("error", reject);
          process.on(
            "exit",
            (_code, _signal) =>
              void ((code = _code), (signal = _signal), resolve())
          );
        }),
      ]);
    },
    { title, cancellable }
  );
  if (!cancelled) {
    if (code || signal) {
      throw new Error(
        `Executing "${command}" command failed (code=${code}, sig=${signal})`
      );
    }
    if (successMessage) {
      showInformationMessage(successMessage);
    }
  }
}
