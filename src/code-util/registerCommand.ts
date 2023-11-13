import {
  commands
} from 'vscode';
import currentContext from './currentContext';
import { newLogger } from '../util/logging';

// eslint-disable-next-line no-unused-vars
const { log, debug, warn, error: logError, exception: logException } = newLogger('Command');

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
        logException(err, commandName);
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
