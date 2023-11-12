import { readRecordings } from "./localRecordings";
import RecordingStore from "./RecordingStore";


export class LocalRecordingsTracker {
  recordings = new RecordingStore();

  constructor() {
    this.recordings = new RecordingStore();
  }

  async loadRecordings() {
    const entries = readRecordings();
    this.recordings.set(entries);
    // TODO: add a file watch
  }
}

export const localRecordingsTracker = new LocalRecordingsTracker();
