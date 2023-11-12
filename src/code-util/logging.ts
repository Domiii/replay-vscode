import EmptyObject from "../util/EmptyObject";
import { onLogError } from "../util/logging";
import { showErrorMessage, showInformationMessage } from "./codeModals";


let isShowingAllError = true;

export function toggleErrorLog() {
  setErrorLogFlag(!isShowingAllError);
}

export function setErrorLogFlag(val: boolean) {
  isShowingAllError = !!val;
  showInformationMessage(`${isShowingAllError ? 'showing' : 'hiding'} all error log.`);
}

export function initLogging() {
  onLogError(onError);
}

function onError(...args: any[]) {
  if (isShowingAllError) {
    const btns = EmptyObject;
    const messageCfg = EmptyObject;
    const moreCfg = {
      noPrefix: true
    };
    showErrorMessage(args.join(' '), btns, messageCfg, moreCfg);
  }
}
