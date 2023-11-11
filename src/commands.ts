/* Copyright 2023 Record Replay Inc. */

import { spawn, SpawnOptions } from "child_process";
import { registerCommand } from "./code-util/registerCommand";
import { updateDecorations } from "./decorations";
import { openUrl } from "./util/system";
import { Readable } from "stream";
import { runTaskWithProgressBar } from "./code-ui/progressBar";
import { streamToLineIterator } from "./util/streams";
import { showInformationMessage } from "./code-util/codeModals";

export function initCommands() {
	registerCommand('replay.gotoAppReplayIo', () => {
    openUrl("https://app.replay.io");
	});
  
  registerCommand('replay.updateBrowsers', async () => {
    const process = spawn("replay", ["update-browsers"]);
    
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
    }, { title: "Updating Replay Browser" });
    if (code || signal) {
      throw new Error(`Update browsers failed code=${code}, signal=${signal} - ERROR: ${(errorOut as string | null)?.trim() || ""}`);
    }
    showInformationMessage("Replay Browser has been updated!");
  });
  registerCommand('replay.makeRecording', () => {
    
  });
  registerCommand('replay.openRecording', () => {
    
  });
  registerCommand('replay.toggleRecordingLiveSync', () => {
    
  });
}

async function streamStdioToBuffer(stdio: Readable) {
  const chunks = [];
  for await (const chunk of stdio) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
}
