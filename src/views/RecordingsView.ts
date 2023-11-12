/* @ts-ignore */
import { newLogger } from "@dbux/common/src/log/logger";
import BaseTreeViewNodeProvider from "../code-ui/treeView/BaseTreeViewNodeProvider";
import BaseTreeViewNode from "../code-ui/treeView/BaseTreeViewNode";
import { RecordingEntry } from "@replayio/replay";
import { localRecordingsTracker } from "../replay-recordings/LocalRecordingsTracker";
import { openUrl } from "../util/system";
import { confirm, showInformationMessage, showWarningMessage } from "../code-util/codeModals";
import { spawnAsync } from "../code-util/spawn";

/** ###########################################################################
 * {@link RecordingsView}
 * ##########################################################################*/

class RecordingsView extends BaseTreeViewNodeProvider<RecordingViewNode> {
  constructor() {
    super("replayRecordingsView");
  }

  initOnActivate() {
    // Register event handlers.
    localRecordingsTracker.recordings.events.on("update", () => {
      this.refresh();
    });

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
    
    return `${icon} ${uri}`;
  }

  static makeProperties(recording: RecordingEntry) {
    return {
      description: `${recording.createTime?.toLocaleDateString()} ${recording.createTime?.toLocaleTimeString()}`,
      tooltip: recording.id
    };
  }

  get contextValue() {
    return this.constructor.name + `.${this.entry.status}`;
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
