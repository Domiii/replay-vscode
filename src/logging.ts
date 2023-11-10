/* @ts-ignore */
import EmptyObject from '@dbux/common/src/util/EmptyObject';
/* @ts-ignore */
import { onLogError } from '@dbux/common/src/log/logger';
/* @ts-ignore */
import { showInformationMessage, showErrorMessage } from './codeUtil/codeModals';

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