import WebSocket from "ws";
import os from "os";

// Work-around for some of our dependencies

(function hackfixGlobals() {
  /* @ts-ignore */
  globalThis.window = globalThis;

  /* @ts-ignore */
  globalThis.WebSocket = WebSocket;

  /* @ts-ignore */
  globalThis.location = {
    href: "https://app.replay.io",
  };

  /* @ts-ignore */
  globalThis.navigator = {
    userAgent: os.type(),
  };

  /* @ts-ignore */
  globalThis.addEventListener = () => {};

  /* @ts-ignore */
  globalThis.WebSocket = WebSocket;
})();


/**
 * Problem: console.debug logs everything twice on this VSCode version.
 * → Use console.log instead for now.
 * @see https://github.com/microsoft/vscode/issues/198044
 */
(function hackfixOther() {
  console.debug = (...args: any[]) => {
    return console.log(...args);
  };
})();
