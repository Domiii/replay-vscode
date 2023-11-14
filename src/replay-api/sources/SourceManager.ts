import { newLogger } from "../../util/logging";

const { log, debug, warn, error: logError, exception: logException } = newLogger("SourceManager");

export default class SourceManager {
  constructor() {}
}

export const sourceManager = new SourceManager();
