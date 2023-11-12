import { RecordingEntry } from "@replayio/replay";
import { EventEmitter } from "tseep";
import { commands } from "vscode";
/* @ts-ignore */
import SyncPromise from "@dbux/common/src/util/SyncPromise";
import { ApiClient } from "./ApiClient";
import { sourceManager } from "./sources/SourceManager";

export default class ReplayLiveSyncManager {
  recording: RecordingEntry | null = null;
  client: ApiClient | null = null;
  busyPromise: SyncPromise | null = null;
  busy = 0;

  private _events = new EventEmitter<{
    startSync: (manager: ReplayLiveSyncManager) => void;
    stopSync: (manager: ReplayLiveSyncManager) => void;
    busyStateUpdate: (loading: boolean, manager: ReplayLiveSyncManager) => void;
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

  async startSync(recording: RecordingEntry) {
    console.debug(`ReplayLiveSyncManager.startSync ${recording.id}`);
    if (this.client) {
      throw new Error(`Tried to call startSync while already syncing.`);
    }
    this.client = new ApiClient();
    this.client.events.on("busyStateUpdate", (loading) => {
      this._events.emit("busyStateUpdate", loading, this);
    });
    this.recording = recording;
    this._events.emit("startSync", this);
    commands.executeCommand('setContext', 'replay.context.liveSyncId', recording.id);

    // Start session.
    await this.client.startSession(recording.id);

    // Get sources.
    await sourceManager.startSync();
  }

  async stopSync() {
    if (this.client) {
      console.debug(`ReplayLiveSyncManager.stopSync ${this.recording?.id}`);
      commands.executeCommand('setContext', 'replay.context.liveSyncId', null);
      this._events.emit("stopSync", this);
      this.client.close();
      this.client = null;
      this.recording = null;
    }
  }

  async toggleSync(recording: RecordingEntry) {
    const wasSyncing = this.recording?.id == recording.id;
    if (this.recording) {
      // Stop previous sync.
      await this.stopSync();
    }
    if (!wasSyncing) {
      // Start new sync.
      await this.startSync(recording);
    }
  }
}

export const replayLiveSyncManager = new ReplayLiveSyncManager();
