import { RecordingEntry } from "@replayio/replay";
import EmptyArray from "../util/EmptyArray";

export default class RecordingList {
  entries: readonly RecordingEntry[];

  constructor(entries: readonly RecordingEntry[] = EmptyArray) {
    this.entries = entries;
  }

  
}
