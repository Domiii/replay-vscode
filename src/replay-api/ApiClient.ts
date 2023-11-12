import { client } from "protocol/socket";
import { ReplayClient } from "shared/client/ReplayClient";

import { WebSocket } from "ws";
import { EventEmitter } from "tseep";
import { newLogger } from "../util/logging";

const DispatchAddress = "wss://dispatch.replay.io";

const SampleRecordingId = "cec0e180-e974-4006-967e-332898dee2e8";
const SamplePoint = "31128880624384868365";

const { log, debug, warn, error: logError, exception: logException } = newLogger("ApiClient");

/** ###########################################################################
 * Singleton workaround.
 * ##########################################################################*/

let gHackfixInited = false;
let gCurrentSocket: WebSocket | null = null;

const sendCommandEvents = new EventEmitter<{
  commandStart: (method: any, params: any, sessionId?: string, pauseId?: string) => void;
  commandEnd: (method: any, params: any, sessionId?: string, pauseId?: string) => void;
}>();

/**
 * Hackfix for the socket being a singleton.
 */
function initWebSocketHackfix() {
  window.WebSocket = class WebSocketWrapper extends WebSocket {
    constructor(...args: [any, any, any]) {
      super(...args);
      // Get a reference to the active socket.
      gCurrentSocket = this as any;
    }
  };
}

function makeSendCommandWrapper(sendCommand: any) {
  /**
   * method: M,
   * params: CommandParams<M>,
   * sessionId?: string,
   * pauseId?: string
   */
  return async (...args: [any, any, any, any]) => {
    try {
      debug(`command start: ${args[0]}...`);
      sendCommandEvents.emit("commandStart", ...args);
      return await sendCommand(...args);
    }
    catch (err: unknown) {
      logException(err, `Command Failure`);
      throw err;
    }
    finally {
      debug(` (command end: ${args[0]})`);
      sendCommandEvents.emit("commandEnd", ...args);
    }
  };
}

function initHackfixes() {
  if (gHackfixInited) {
    return;
  }
  gHackfixInited = true;

  // Get one of the global sockets.
  initWebSocketHackfix();

  // Hook sendCommand calls.
  (client['genericClient'] as any).sendCommand = makeSendCommandWrapper(
    (client['genericClient'] as any).sendCommand
  );

  // Add an error handler.
  client.Recording.addSessionErrorListener((err) => {
    logError(`[SESSION ERROR] ${err.code}: ${err.message}`);
  });
}

/** ###########################################################################
 * {@link ApiClient}
 * ##########################################################################*/

export class ApiClient extends ReplayClient {
  socket: WebSocket | null = null;
  private loading: number = 0;
  private _events = new EventEmitter<{
    loadingStateUpdate: (loading: boolean, client: ApiClient) => void;
  }>();

  constructor() {
    super(DispatchAddress);
    initHackfixes();

    sendCommandEvents.addListener("commandStart", this._onCommandStart);
    sendCommandEvents.addListener("commandEnd", this._onCommandEnd);
  }

  get events(): typeof this._events {
    return this._events;
  }

  get isLoading() {
    return !!this.loading;
  }

  get isClientReady() {
    return !!this.getSessionId();
  }

  _onCommandStart = (...args: any[]) => {
    this.incLoading();
  };

  _onCommandEnd = (...args: any[]) => {
    this.decLoading();
  };

  close() {
    /**
     * NOTE: The underlying socket is a singleton.
     * That is a design flaw we probably won't be able to remedy any time soon.
     */
    if (this.socket !== gCurrentSocket) {
      console.warn(`ApiClient.close called but socket has changed.`);
    }
    this.socket?.close();
    gCurrentSocket = null;
    this.resetLoading();
    sendCommandEvents.removeListener("commandStart", this._onCommandStart);
    sendCommandEvents.removeListener("commandEnd", this._onCommandEnd);
  }

  private resetLoading() {
    if (this.loading) {
      this.loading = 0;
      this._events.emit("loadingStateUpdate", false, this);
    }
  }

  private incLoading() {
    if (!this.loading) {
      this._events.emit("loadingStateUpdate", true, this);
    }
    ++this.loading;
  }

  private decLoading() {
    --this.loading;
    if (!this.loading) {
      this._events.emit("loadingStateUpdate", false, this);
    }
  }

  async initialize(...args: [any, any]) {
    // Use a hack to get the socket, so we can close it later.
    // (Not sure why this creates a socket. Its different from the ProtocolClient's socket.)
    if (gCurrentSocket) {
      // This means we did not have proper control over the socket singleton.
      console.warn(
        `ApiClient.initialize was called even though a socket already existed.`
      );
    }
    // Note: As of writing, `initialize` calls `initSocket` synchronously.
    const promise = super.initialize(...args);
    if (!gCurrentSocket) {
      console.warn(`ApiClient.initialize: socket not found.`);
    }
    this.socket = gCurrentSocket;
    this.resetLoading();
    try {
      return await promise;
    } finally {
      this.decLoading();
    }
  }

  async startSession(recordingId: string) {
    const accessToken = process.env.RECORD_REPLAY_API_KEY;
    if (!accessToken) {
      // TODO: Use UserKeyValueStore to allow user to provide a key dynamically.
      throw new Error(
        `Could not start session because RECORD_REPLAY_API_KEY was not set.`
      );
    }

    await this.initialize(recordingId, accessToken);
  }

  async runExperiment(recordingId: string = SampleRecordingId) {
    await this.startSession(recordingId);
    console.log("Running experiment...");
    const expr = "3 * 4";
    const result = await this.justEval(SamplePoint, expr);
    console.log(`runExperiment result =`, result);
  }

  async eval(point: string, expression: string, frameId: string | null = null) {
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
      return "(eval failed)";
    }
  }
}
