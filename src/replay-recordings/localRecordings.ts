/* Copyright 2023 Record Replay Inc. */

/**
 * @file This is mostly a copy+paste from @replayio/replay/src/main.ts
 * This is necessary because replay-cli does not `export` these functions.
 */

import path from "path";
import fs from "fs";
import { RecordingEntry } from "@replayio/replay/src/types";
import { generateDefaultTitle } from "@replayio/replay/src/generateDefaultTitle";
import { getDirectory as getRecordingsDirectory } from "@replayio/replay/src/utils";

function getRecordingsFile() {
  const dir = getRecordingsDirectory();
  return path.join(dir, "recordings.log");
}

function readRecordingFile() {
  const file = getRecordingsFile();
  if (!fs.existsSync(file)) {
    return [];
  }

  return fs.readFileSync(file, "utf8").split("\n");
}

function getBuildRuntime(buildId: string) {
  const match = /.*?-(.*?)-/.exec(buildId);
  return match ? match[1] : "unknown";
}

function updateStatus(recording: RecordingEntry, status: RecordingEntry["status"]) {
  // Once a recording enters an unusable or crashed status, don't change it
  // except to mark crashes as uploaded.
  if (
    recording.status == "unusable" ||
    recording.status == "crashUploaded" ||
    (recording.status == "crashed" && status != "crashUploaded")
  ) {
    return;
  }
  recording.status = status;
}

let recordingEntries: RecordingEntry[];

export function getRecordingEntry(id: string) {
  // Quick-n-dirty memory cache
  const recordings = (recordingEntries = recordingEntries || readRecordings());
  const recording = recordings.find(r => r.id == id);
  return recording;
}

export function readRecordings(
  includeHidden = false
) {
  const recordings: RecordingEntry[] = [];
  const lines = readRecordingFile();
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (e) {
      // Ignore lines that aren't valid JSON.
      continue;
    }

    switch (obj.kind) {
      case "createRecording": {
        const { id, timestamp, buildId } = obj;
        recordings.push({
          id,
          createTime: new Date(timestamp),
          buildId,
          runtime: getBuildRuntime(buildId),
          metadata: {},
          sourcemaps: [],

          // We use an unknown status after the createRecording event because
          // there should always be later events describing what happened to the
          // recording.
          status: "unknown",
        });
        break;
      }
      case "addMetadata": {
        const { id, metadata } = obj;
        const recording = recordings.find(r => r.id == id);
        if (recording) {
          Object.assign(recording.metadata, metadata);

          if (!recording.metadata.title) {
            recording.metadata.title = generateDefaultTitle(recording.metadata);
          }
        }
        break;
      }
      case "writeStarted": {
        const { id, path } = obj;
        const recording = recordings.find(r => r.id == id);
        if (recording) {
          updateStatus(recording, "startedWrite");
          recording.path = path;
        }
        break;
      }
      case "writeFinished": {
        const { id } = obj;
        const recording = recordings.find(r => r.id == id);
        if (recording) {
          updateStatus(recording, "onDisk");
        }
        break;
      }
      case "uploadStarted": {
        const { id, server, recordingId } = obj;
        const recording = recordings.find(r => r.id == id);
        if (recording) {
          updateStatus(recording, "startedUpload");
          recording.server = server;
          recording.recordingId = recordingId;
        }
        break;
      }
      case "uploadFinished": {
        const { id } = obj;
        const recording = recordings.find(r => r.id == id);
        if (recording) {
          updateStatus(recording, "uploaded");
        }
        break;
      }
      case "recordingUnusable": {
        const { id, reason } = obj;
        const recording = recordings.find(r => r.id == id);
        if (recording) {
          updateStatus(recording, "unusable");
          recording.unusableReason = reason;
        }
        break;
      }
      case "crashed": {
        const { id } = obj;
        const recording = recordings.find(r => r.id == id);
        if (recording) {
          updateStatus(recording, "crashed");
        }
        break;
      }
      case "crashData": {
        const { id, data } = obj;
        const recording = recordings.find(r => r.id == id);
        if (recording) {
          if (!recording.crashData) {
            recording.crashData = [];
          }
          recording.crashData.push(data);
        }
        break;
      }
      case "crashUploaded": {
        const { id } = obj;
        const recording = recordings.find(r => r.id == id);
        if (recording) {
          updateStatus(recording, "crashUploaded");
        }
        break;
      }
      case "sourcemapAdded": {
        const {
          id,
          recordingId,
          path,
          baseURL,
          targetContentHash,
          targetURLHash,
          targetMapURLHash,
        } = obj;
        const recording = recordings.find(r => r.id == recordingId);
        if (recording) {
          recording.sourcemaps.push({
            id,
            path,
            baseURL,
            targetContentHash,
            targetURLHash,
            targetMapURLHash,
            originalSources: [],
          });
        }
        break;
      }
      case "originalSourceAdded": {
        const { recordingId, path, parentId, parentOffset } = obj;
        const recording = recordings.find(r => r.id === recordingId);
        if (recording) {
          const sourcemap = recording.sourcemaps.find(s => s.id === parentId);
          if (sourcemap) {
            sourcemap.originalSources.push({
              path,
              parentOffset,
            });
          }
        }
        break;
      }
    }
  }

  if (includeHidden) {
    return recordings;
  }

  // There can be a fair number of recordings from gecko/chromium content
  // processes which never loaded any interesting content. These are ignored by
  // most callers. Note that we're unable to avoid generating these entries in
  // the first place because the recordings log is append-only and we don't know
  // when a recording process starts if it will ever do anything interesting.
  return recordings.filter(
    r => !(r.unusableReason || "").includes("No interesting content")
  );
}
