/* @ts-ignore */
import { newLogger } from "@dbux/common/src/log/logger";
import BaseTreeViewNodeProvider from "../code-ui/treeView/BaseTreeViewNodeProvider";
import BaseTreeViewNode from "../code-ui/treeView/BaseTreeViewNode";
import { RecordingEntry } from "@replayio/replay";
import { localRecordingsTracker } from "../recordings/LocalRecordingsTracker";
import { openUrl } from "../util/system";

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
  startedUpload: "⌛",
  crashUploaded: "💥✔",
  unusable: "❓",
};

/** ###########################################################################
 * {@link RecordingViewNode}
 * ##########################################################################*/

export class RecordingViewNode extends BaseTreeViewNode<RecordingEntry> {
  /**
   *
   */
  static makeLabel(recording: RecordingEntry) {
    const uri = recording.metadata.uri;
    const icon = StatusIcons[recording.status] || "";
    return `${icon} ${uri}`;
  }

  static makeProperties(recording: RecordingEntry) {
    return {
      description: `${recording.createTime?.toLocaleDateString()} ${recording.createTime?.toLocaleTimeString()}`
    };
  }

  async handleClick() {
    await openUrl(`https://app.replay.io/recording/${this.entry.id}`);
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
