import { ReplayClient } from "shared/client/ReplayClient";

const DispatchAddress = "wss://dispatch.replay.io";

// const SampleRecordingId = "cec0e180-e974-4006-967e-332898dee2e8";
const SamplePoint = "31128880624384868365";

export class ApiClient extends ReplayClient {
  constructor() {
    super(DispatchAddress);
  }

  isClientReady() {
    return !!this.getSessionId();
  }

  async startSession(recordingId: string) {
    const accessToken = process.env.RECORD_REPLAY_API_KEY;
    if (!accessToken) {
      throw new Error(
        `Could not start session because RECORD_REPLAY_API_KEY was not set.`
      );
    }

    console.trace(`startSession("${recordingId}")`);
    // const { createReplayClientForProduction } = await import("shared/utils/client");

    await this.initialize(recordingId, accessToken);
  }

  async runExperiment(recordingId: string) {
    await this.startSession(recordingId);
    console.log("Running experiment...");
    const expr = "3 * 4";
    const result = await this.eval(SamplePoint, expr);
    console.log(`runExperiment result =`, result);
  }

  async eval(
    point: string,
    expression: string,
    frameId: string | null = null
  ) {
    await this.waitForSession();

    const { pauseId } = await this.createPause(point);
    return await this.evaluateExpression(pauseId, expression, frameId);
  }

  /**
   * A simpler infallable version of `eval`, that simply returns the result
   * or a string indicating failure.
   */
  async justEval(
    point: string,
    expression: string,
    frameId: string | null = null
  ) {
    const result = await this.eval(point, expression, frameId);
    if (result?.returned && "value" in result.returned) {
      return result.returned.value;
    } else {
      console.error(`eval failed: ${JSON.stringify(result)}`);
      return '(eval failed)';
    }
  }
}
