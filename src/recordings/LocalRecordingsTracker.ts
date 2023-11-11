import { getDirectory } from "@replayio/replay/src/utils";
import path from "path";
import { readRecordings } from "./localRecordings";
import RecordingList from "./RecordingList";


export function getRecordingsFile() {
  const dir = getDirectory();
  return path.join(dir, "recordings.log");
}

export default class LocalRecordingsTracker {
  list: RecordingList;

  constructor() {
    this.list = new RecordingList();
  }

  async loadRecordings() {
    this.list = new RecordingList(readRecordings(getRecordingsFile()));
  }
}
