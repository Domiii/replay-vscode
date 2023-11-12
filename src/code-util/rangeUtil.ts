/**
 * VSCode's lines are 0-based, while Replay's are 1-based.
 */
export function vscodeLineToReplayLine(i: number) {
  return i + 1;
}
export function replayLineToVSCodeLine(i: number) {
  return i - 1;
}
