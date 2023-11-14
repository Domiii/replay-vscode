import { RecordingEntry } from "@replayio/replay";
import { EventEmitter } from "tseep";
import { commands } from "vscode";
/* @ts-ignore */
import SyncPromise from "@dbux/common/src/util/SyncPromise";
import { ApiClient } from "./replay-api/ApiClient";
import { editorSourceManager } from "./code-ui/sources/EditorSourceManager";

/**
 * Manage all sessions.
 */
export default class ReplaySessionManager {
  recording: RecordingEntry | null = null;
  client: ApiClient | null = null;
  busyPromise: SyncPromise | null = null;
  busy = 0;

  private _events = new EventEmitter<{
    startSync: (manager: ReplaySessionManager) => void;
    stopSync: (manager: ReplaySessionManager) => void;
    busyStateUpdate: (loading: boolean, manager: ReplaySessionManager) => void;
  }>();

  get events(): typeof this._events {
    return this._events;
  }

  /**
   * Whether a recording for sync mode has been picked.
   */
  get isSyncing() {
    return !!this.recording;
  }

  get isBusy() {
    return !!this.client?.isBusy;
  }

  get syncId() {
    return this.recording?.id;
  }

  async startSession(recording: RecordingEntry) {
    console.debug(`ReplaySessionManager.startSync ${recording.id}`);
    if (this.client) {
      throw new Error(`Tried to call startSync while already syncing.`);
    }
    this.client = new ApiClient();
    this.client.incBusy();
    try {
      this.client.events.on("busyStateUpdate", (loading) => {
        this._events.emit("busyStateUpdate", loading, this);
      });
      this.recording = recording;
      this._events.emit("startSync", this);
      commands.executeCommand(
        "setContext",
        "replay.context.liveSyncId",
        recording.id
      );

      // Notify source manager, that we are about to start.
      await editorSourceManager.beforeStartSync();

      // Start session.
      await this.client.startSession(recording.id);

      // Get sources and other basic data.
      await editorSourceManager.startSync();
    } finally {
      this.client.decBusy();
    }
  }

  async stopSession() {
    if (this.client) {
      console.debug(`ReplaySessionManager.stopSync ${this.recording?.id}`);
      commands.executeCommand("setContext", "replay.context.liveSyncId", null);
      this._events.emit("stopSync", this);
      this.client.close();
      this.client = null;
      this.recording = null;
    }
  }

  async toggleSession(recording: RecordingEntry) {
    const wasSyncing = this.recording?.id == recording.id;
    if (this.recording) {
      // Stop previous sync.
      await this.stopSession();
    }
    if (!wasSyncing) {
      // Start new sync.
      await this.startSession(recording);
    }
  }

  /** ###########################################################################
   * Disposable Management
   * ##########################################################################*/
}

export const replaySessionManager = new ReplaySessionManager();
