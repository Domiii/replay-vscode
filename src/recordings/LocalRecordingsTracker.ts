import { getDirectory } from "@replayio/replay/src/utils";
import path from "path";
import { readRecordings } from "./localRecordings";
import RecordingStore from "./RecordingStore";


export function getRecordingsFile() {
  const dir = getDirectory();
  return path.join(dir, "recordings.log");
}

export class LocalRecordingsTracker {
  recordings = new RecordingStore();

  constructor() {
    this.recordings = new RecordingStore();
  }

  async loadRecordings() {
    const entries = readRecordings(getRecordingsFile());
    this.recordings.set(entries);
    // TODO: add a file watch
  }
}

export const localRecordingsTracker = new LocalRecordingsTracker();
