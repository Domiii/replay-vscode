import { RecordingEntry } from "@replayio/replay";
import { EventEmitter } from "tseep";
import { ApiClient } from "../replay-api/ApiClient";
import { commands } from "vscode";

export default class ReplayLiveSyncManager {
  recording: RecordingEntry | null = null;
  client: ApiClient | null = null;

  private _events = new EventEmitter<{
    startSync: (manager: ReplayLiveSyncManager) => void;
    stopSync: (manager: ReplayLiveSyncManager) => void;
    loadingStateUpdate: (loading: boolean, manager: ReplayLiveSyncManager) => void;
  }>();

  get isLoading() {
    return !!this.client?.isLoading;
  }

  get events(): typeof this._events {
    return this._events;
  }

  get isSyncing() {
    return !!this.recording;
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
    this.client.events.on("loadingStateUpdate", (loading) => {
      this._events.emit("loadingStateUpdate", loading, this);
    });
    this.recording = recording;
    this._events.emit("startSync", this);
    commands.executeCommand('setContext', 'replay.context.liveSyncId', recording.id);

    // await this.client.runExperiment(recording.id);
    await this.client.runExperiment();
  }

  stopSync() {
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
      this.stopSync();
    }
    if (!wasSyncing) {
      // Start new sync.
      this.startSync(recording);
    }
  }
}

export const replayLiveSyncManager = new ReplayLiveSyncManager();
