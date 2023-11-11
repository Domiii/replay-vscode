// import { ReplayClientInterface } from "shared/client/types";
// import { createReplayClientForProduction } from "shared/utils/client";

const SampleRecordingId = "cec0e180-e974-4006-967e-332898dee2e8";
const SamplePoint = "31128880624384868365";

export async function recordAndUpload(url: string) {
  // TODO
  return SampleRecordingId;
}

let currentClient: any;

export function isClientReady() {
  return !!currentClient?.getSessionId();
}

export async function startSession(recordingId: string = SampleRecordingId) {
  const accessToken = process.env.RECORD_REPLAY_API_KEY;
  if (!accessToken) {
    throw new Error(`Could not start session because RECORD_REPLAY_API_KEY was not set.`);
  }

  console.debug(`startSession("${recordingId}")`);
  const { createReplayClientForProduction } = await import("shared/utils/client");
  currentClient = createReplayClientForProduction();

  await currentClient.initialize(recordingId, accessToken);
}

function assertClient() {
  if (!currentClient) { throw new Error("Client does not exist. Call startSession first."); }
}

export async function evalAtPoint(point: string, expression: string, frameId: string | null = null) {
  assertClient();

  await currentClient.waitForSession();

  const { pauseId } = await currentClient.createPause(point);
  return await currentClient.evaluateExpression(pauseId, expression, frameId);
}

export async function runExperiment() {
  await startSession();
  const expr = "3 * 4";
  const result = await evalAtPoint(SamplePoint, expr);
  if ("value" in result.returned) {
    const value = result.returned.value;
    console.log(`runExperiment - ${expr} = ${JSON.stringify(result)}`);
  }
  else {
    console.error(`runExperiment failed: ${JSON.stringify(result)}`);
  }
}
