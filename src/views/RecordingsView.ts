/* @ts-ignore */
import BaseTreeViewNodeProvider from "../code-ui/treeView/BaseTreeViewNodeProvider";
import BaseTreeViewNode from "../code-ui/treeView/BaseTreeViewNode";
import { RecordingEntry } from "@replayio/replay";
import { localRecordingsTracker } from "../replay-recordings/LocalRecordingsTracker";
import { openUrl } from "../util/system";
import { showWarningMessage } from "../code-util/codeModals";
import { spawnAsync } from "../code-util/spawn";
import { replayLiveSyncManager } from "../replay-live-sync/ReplayLiveSyncManager";

/** ###########################################################################
 * {@link RecordingsView}
 * ##########################################################################*/

class RecordingsView extends BaseTreeViewNodeProvider<RecordingViewNode> {
  constructor() {
    super("replayRecordingsView");
  }

  initOnActivate() {
    // Register event handlers.
    localRecordingsTracker.recordings.events.on("update", this.refresh);
    replayLiveSyncManager.events.on("startSync", this.refresh);
    replayLiveSyncManager.events.on("stopSync", this.refresh);

    // Start rendering.
    this.refresh();

    // Load once.
    localRecordingsTracker.loadRecordings();
  }

  DefaultNodeClass = RecordingViewNode;
  EmptyNodeDescription = "(no recordings yet)";
  getRootEntries = () => {
    const entries = localRecordingsTracker.recordings.data.concat();
    entries.sort((a, b) => b.createTime.getTime() - a.createTime.getTime());
    return entries;
  };
}

const StatusIcons = {
  onDisk: "💾",
  crashed: "💥💾",
  unknown: "❓",
  uploaded: "✅",
  startedWrite: "⌛",
  startedUpload: "❌",
  crashUploaded: "💥✔",
  unusable: "❓",
};

export type FullStatus = "onDisk" | "unknown" | "uploaded" | "crashed" | "startedWrite" | "startedUpload" | "crashUploaded" | "unusable" | "syncing";

/** ###########################################################################
 * {@link RecordingViewNode}
 * ##########################################################################*/

export function getRecordingLabel(recording: RecordingEntry) {
  return recording.metadata?.uri || recording.metadata?.title || "";
}

export class RecordingViewNode extends BaseTreeViewNode<RecordingEntry> {
  /**
   *
   */
  static makeLabel(recording: RecordingEntry) {
    const uri = getRecordingLabel(recording);
    let icon = StatusIcons[recording.status] || "";
    if (replayLiveSyncManager.syncId == recording.id) {
      icon = "🔴";
    }
    return `${icon} ${uri}`;
  }

  static makeProperties(recording: RecordingEntry) {
    return {
      description: `${recording.createTime?.toLocaleDateString()} ${recording.createTime?.toLocaleTimeString()}`,
      tooltip: recording.id
    };
  }

  get isSyncing() {
    return replayLiveSyncManager.syncId == this.entry.id;
  }

  get fullStatus() {
    return this.isSyncing ? "syncing" : this.entry.status;
  }

  get contextValue() {
    return `${this.constructor.name}.${this.entry.id}.${this.fullStatus}`;
  }

  async handleClick() {
    const { id, status } = this.entry;
    switch (status) {
      case "uploaded":
        await openUrl(`https://app.replay.io/recording/${id}`);
        break;
      case "crashed":
      case "onDisk":
      case "startedWrite":
        // await confirm(`Upload the ${status === "crashed" ? "crash report" : "recording"}?`);
        try {
          await spawnAsync({
            command: "replay",
            args: ["upload", id],
            title:"Uploading Replay",
            cancellable: true
          });
        }
        finally {
          localRecordingsTracker.loadRecordings();
        }
        break;
      case "startedUpload":
        showWarningMessage("Upload started but did not finish. You probably have to delete it remotely and upload again. Reach out to us for more help.");
        break;
    }

  }
}

/** ###########################################################################
 * init
 * ##########################################################################*/

export let recordingsView: RecordingsView;

export function initRecordingsView() {
  recordingsView = new RecordingsView();
  recordingsView.initOnActivate();
}
