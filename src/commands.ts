

import { registerCommand } from "./code-util/registerCommand";
import { openUrl } from "./util/system";
import { Readable } from "stream";
import { spawnAsync } from "./code-util/spawn";

export function initCommands() {
	registerCommand('replay.gotoAppReplayIo', async () => {
    await openUrl("https://app.replay.io");
	});
  
  registerCommand('replay.updateBrowsers', async () => {
    await spawnAsync({
      command: "replay",
      args: ["update-browsers"],
      title:"Updating Replay Browser",
      successMessage: "Replay Browser has been updated!"
    });
  });
  registerCommand('replay.makeRecording', async () => {
    await spawnAsync({
      command: "replay",
      args: ["launch", "http://localhost:3456"],
      title: "Starting the Replay Browser"
    });
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
