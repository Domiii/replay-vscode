import {
  window,
  ProgressLocation,
  Progress,
  ProgressOptions,
  CancellationToken,
} from "vscode";
import defaultsDeep from "lodash/defaultsDeep";
/* @ts-ignore */
import SyncPromise from "@dbux/common/src/util/SyncPromise";
import sleep from "../util/sleep";

/**
 *  see `window.withProgress`: https://code.visualstudio.com/api/references/vscode-api
 * @callback reportCallBack
 * @param {{message?: string, increment?: number}} report
 */

/**
 *  see `window.withProgress`: https://code.visualstudio.com/api/references/vscode-api
 * @callback taskWithProgressBarCallback
 * @param {{report: reportCallBack}} progress
 * @param cancellationToken
 */

export type ProgressBarTask<R> = (
  progress: Progress<{
    /**
     * A progress message that represents a chunk of work
     */
    message?: string;
    /**
     * An increment for discrete progress. Increments will be summed up until 100% is reached
     */
    increment?: number;
  }>,
  token: CancellationToken
) => Thenable<R>;

export async function runTaskWithProgressBar<R>(
  cb: ProgressBarTask<R>,
  optionsInput?: Partial<ProgressOptions>
) {
  const options = defaultsDeep(optionsInput, {
    cancellable: false,
    location: ProgressLocation.Notification,
    title: "",
  });
  options.title = `[Replay] ${options.title}`;

  return await window.withProgress(options, async (...args) => {
    // NOTE: we need this sleep in case `cb` starts off with a long-running synchronous operation:
    //     Progress bar only starts rendering after we have given control back first.
    await sleep();

    return await cb?.(...args);
  });
}

class BackgroundProgressBar {
  loadingPromise?: SyncPromise;

  start(title: string) {
    if (this.loadingPromise) {
      // Already running.
      return;
    }
    // Start background progress bar.
    this.loadingPromise = new SyncPromise();
    runTaskWithProgressBar(
      async () => {
        await this.loadingPromise.wait();
      },
      {
        title,
      }
    );
  }

  stop() {
    this.loadingPromise?.resolve();
    this.loadingPromise = null;
  }
}

/**
 * Shows a progress bar with an on and off button.
 */
export function startBackgroundProgressBar() {
  return new BackgroundProgressBar();
}
