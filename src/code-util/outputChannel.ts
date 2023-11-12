import { OutputChannel, window } from 'vscode';
/* @ts-ignore */
import strip from 'strip-color';

export default class OutputChannelWrapper {
  _channel: OutputChannel;
  constructor(name: string) {
    this._channel = window.createOutputChannel(name);
  }

  log(...args: any[]) {
    this._channel.appendLine(args.map(s => strip(String(s))).join(' '));
  }

  show(preserveFocus = false) {
    this._channel.show(preserveFocus);
  }

  hide() {
    this._channel.hide();
  }

  clear() {
    this._channel.clear();
  }
}


const outputChannel = new OutputChannelWrapper('Replay');

// addOutputStreams({
//   log: outputChannel.log.bind(outputChannel),
//   warn: outputChannel.log.bind(outputChannel),
//   error: outputChannel.log.bind(outputChannel),
//   debug: outputChannel.log.bind(outputChannel)
// }, true);

export function showOutputChannel() {
  outputChannel.show();
}
