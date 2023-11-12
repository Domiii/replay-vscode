import { registerCommand } from "./code-util/registerCommand";
import { openUrl } from "./util/system";
import { Readable } from "stream";
import { spawnAsync } from "./code-util/spawn";
import { confirm, showInformationMessage } from "./code-util/codeModals";
import { RecordingViewNode, getRecordingLabel } from "./views/RecordingsView";
import { localRecordingsTracker } from "./recordings/LocalRecordingsTracker";

export function initCommands() {
  /** ###########################################################################
   * Recording view
   * ##########################################################################*/
  registerCommand("replay.gotoAppReplayIo", async () => {
    await openUrl("https://app.replay.io");
  });

  registerCommand("replay.updateBrowsers", async () => {
    await spawnAsync({
      command: "replay",
      args: ["update-browsers"],
      title: "Updating Replay",
      successMessage: "Replay has been updated!",
    });
  });
  registerCommand("replay.makeRecording", async () => {
    await spawnAsync({
      command: "replay",
      args: ["launch", "http://localhost:3456"],
      title: "Start new recording in Replay",
    });
  });

  /** ###########################################################################
   * Recording items
   * ##########################################################################*/
  // registerCommand('replay.openRecording', () => {
  //   showInformationMessage("You can open a recording from the Replay \"Recordings\" view.");
  // });
  registerCommand("replay.deleteRecording", async (node: RecordingViewNode) => {
    const ok = await confirm(
      `Do you want to delete this recording?\n ${node.entry.id}\n ${
        getRecordingLabel(node.entry)
      }`
    );
    if (!ok) {
      return;
    }

    try {
      await spawnAsync({
        command: "replay",
        args: ["rm", node.entry.id],
        title: "Delete Recording",
      });
    } finally {
      localRecordingsTracker.loadRecordings();
    }
  });
  registerCommand("replay.toggleRecordingLiveSync", () => {
    // TODO
  });
}

async function streamStdioToBuffer(stdio: Readable) {
  const chunks = [];
  for await (const chunk of stdio) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
}
