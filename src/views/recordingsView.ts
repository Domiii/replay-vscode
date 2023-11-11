
import { commands } from 'vscode';
/* @ts-ignore */
import { newLogger } from '@dbux/common/src/log/logger';
import BaseTreeViewNodeProvider from '../code-ui/treeView/BaseTreeViewNodeProvider';
import BaseTreeViewNode from '../code-ui/treeView/BaseTreeViewNode';
import { RecordingEntry } from '@replayio/replay';
import { localRecordingsTracker } from '../recordings/LocalRecordingsTracker';

// eslint-disable-next-line no-unused-vars
const { log, debug, warn, error: logError } = newLogger('recordingsView');

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
}


/** ###########################################################################
 * {@link RecordingViewNode}
 * ##########################################################################*/

export class RecordingViewNode extends BaseTreeViewNode<RecordingEntry> {
  /**
   * 
   */
  static makeLabel(recording: RecordingEntry) {
    const prefix = allApplications.selection.containsApplication(app) ? '☑' : '☐';
    // const label = app.getRelativeFolder();
    const label = app.getPreferredName();
    return `${prefix} ${label}`;
  }
  
  handleClick() {
    // TODO: open `https://app.replay.io/recording/${this.entry.id}`
  }
}

/** ###########################################################################
 * init
 * ##########################################################################*/


export let recordingsView: RecordingsView;

export function init() {
  recordingsView = new RecordingsView();
  recordingsView.initOnActivate();
}

