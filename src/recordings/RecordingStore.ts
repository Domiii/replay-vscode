import { RecordingEntry } from "@replayio/replay";
import DataStore from "../util/DataStore";

export default class RecordingStore extends DataStore<RecordingEntry> {
  constructor() {
    super();
  }
}
