import { registerCommand } from "./code-util/registerCommand";
import { openUrl } from "./util/system";
import { Readable } from "stream";
import { spawnAsync } from "./code-util/spawn";
import { confirm, showInformationMessage } from "./code-util/codeModals";
import { RecordingViewNode, getRecordingLabel } from "./views/RecordingsView";
import { localRecordingsTracker } from "./replay-recordings/LocalRecordingsTracker";
import { replayLiveSyncManager } from "./replay-live-sync/ReplayLiveSyncManager";

function makeDefaultReplayCliSpawnOptions() {
  return undefined;
}

export function initCommands() {
  // Hackfix for now: Avoid making (or looking at) recordings with local dev builds.
  process.env = {
    ...process.env,
    RECORD_REPLAY_DIRECTORY: "",
    REPLAY_CHROMIUM_EXECUTABLE_PATH: "",
  };

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
      options: makeDefaultReplayCliSpawnOptions(),
    });
  });
  registerCommand("replay.makeRecording", async () => {
    try {
      await spawnAsync({
        command: "replay",
        args: ["launch", "http://localhost:3456"],
        title: "Start new recording in Replay",
        options: makeDefaultReplayCliSpawnOptions(),
      });
    } finally {
      localRecordingsTracker.loadRecordings();
    }
  });

  /** ###########################################################################
   * Recording items
   * ##########################################################################*/
  // registerCommand('replay.openRecording', () => {
  //   showInformationMessage("You can open a recording from the Replay \"Recordings\" view.");
  // });
  registerCommand("replay.deleteRecording", async (node: RecordingViewNode) => {
    const ok = await confirm(
      `Do you want to delete this recording?\n ${
        node.entry.id
      }\n ${getRecordingLabel(node.entry)}`
    );
    if (!ok) {
      return;
    }

    try {
      await spawnAsync({
        command: "replay",
        args: ["rm", node.entry.id],
        title: "Delete Recording",
        options: makeDefaultReplayCliSpawnOptions(),
      });
    } finally {
      localRecordingsTracker.loadRecordings();
    }
  });
  registerCommand(
    "replay.toggleRecordingLiveSync",
    async (node: RecordingViewNode) => {
      await replayLiveSyncManager.toggleSync(node.entry);
    }
  );
  registerCommand("replay.toggleRecordingLiveSyncActive", async () => {
    await replayLiveSyncManager.stopSync();
  });
}
