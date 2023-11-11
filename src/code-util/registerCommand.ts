import {
  ExtensionContext,
  commands
} from 'vscode';
/* @ts-ignore */
import { newLogger } from '@dbux/common/src/log/logger';
import currentContext from './currentContext';

// eslint-disable-next-line no-unused-vars
const { log, debug, warn, error: logError } = newLogger('Command');

/**
 * Wrap command handlers with error loggin.
 */
export function registerCommand(commandName: string, func: (...args: any[]) => any) {
  function _errWrap(f: (...args: any[]) => any) {
    return async (...args: any[]) => {
      try {
        return await f(...args);
      }
      catch (err) {
        logError(`'${commandName}' failed:`, err);
        // throw err;
        return null;
      }
    };
  }

  const result = commands.registerCommand(commandName, _errWrap(func));
  
  // clear on deactivate
  currentContext().subscriptions.push(result);

  return result;
}
