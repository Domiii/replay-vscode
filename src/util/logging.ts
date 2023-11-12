import isString from 'lodash/isString';
import isPlainObject from 'lodash/isPlainObject';
import { EventEmitter } from "tseep";
/* @ts-ignore */
import { err2String } from '@dbux/common/src/util/errorLog';
/* @ts-ignore */
import { consoleOutputStreams } from '@dbux/common/src/console';


// ###########################################################################
// reporting + flood gating
// ###########################################################################


const reportEmitter = new EventEmitter<{
  error: (...args: any[]) => void;
}>();

const MinSecondsPerReport = 2;
const MinGateReportThreshold = 1;
let floodGate = false;
let floodGateReported = false;
let nGatedReports = 0;
let lastReportTime = 0;
let floodGateTimer: NodeJS.Timeout;

function startFloodGate() {
  floodGateTimer = setTimeout(liftFloodGate, MinSecondsPerReport * 1000);
}

function liftFloodGate() {
  floodGate = false;

  if (nGatedReports >= MinGateReportThreshold) {  // only report if there is a substantial amount
    // floodGateTimer = null;
    loglog('Error floodgate', `Floodgate lifted. Muted ${nGatedReports} reports in the past ${MinSecondsPerReport} seconds.`);
  }
  nGatedReports = 0;
}

function report(...args: any[]) {
  // floodgate mechanism
  if (floodGate) {
    // flood gate in effect
    ++nGatedReports;
    if (!floodGateReported) {
      floodGateReported = true;
      reportEmitter.emit('error', `[Error floodgate] reporting muted due to possibly error flood.`);
    }
    return;
  }

  // check if flood gate started
  const time = Date.now() / 1000;
  const dt = (time - lastReportTime);
  lastReportTime = time;
  floodGate = dt < MinSecondsPerReport;

  if (floodGate) {
    startFloodGate();
  }

  /* @ts-ignore */
  reportEmitter.emit(...args);
}

/**
 * Use this as error hook
 */
export function onLogError(cb: any) {
  reportEmitter.on('error', cb);
}

// ###########################################################################
// Logger
// ###########################################################################

function nsWrapper(logCb: any, ns: string) {
  return (...args: any[]) => {
    logCb(ns, ...args);
    // this._emitter.emit(name, ...args);
  };
}

export class Logger {
  log: any;
  debug: any;
  warn: any;
  error: any;
  ns: string;

  constructor(ns: string, logWrapper = nsWrapper) {
    this.ns = ns;
    // this._emitter = 

    const logFunctions = {
      log: loglog,
      debug: logDebug,
      warn: logWarn,
      error: logError,
      trace: logTrace
    };
    this._addLoggers(logFunctions, logWrapper);
  }

  exception = logException;

  _addLoggers(logFunctions: any, logWrapper: any) {
    for (const name in logFunctions) {
      const f = logFunctions[name];
      // const nsArgs = (ns && [ns] || EmptyArray);
      this[name] = logWrapper(f, this.ns);
    }
  }
}


// ###########################################################################
// utility functions
// ###########################################################################

export function newLogger(ns: string) {
  return new Logger(ns && `Replay ${ns}`);
}

export function newFileLogger(fpath: string) {
  const comps = fpath.split(/[/\\]/);
  let fname = comps[comps.length - 1];
  const i = fname.lastIndexOf('.');
  if (i > -1) {
    fname = fname.substring(0, i);
  }
  return new Logger(fname);
}

let outputStreams = consoleOutputStreams;

function mergeOutputStreams(newStreams: any) {
  return Object.fromEntries(
    Object.entries(outputStreams).map(([name, cb]) => {
      return [
        name,
        (...args: any[]) => {
          (cb as any)(...args);
          newStreams[name]?.apply(newStreams, args);
        }
      ];
    })
  );
}

function wrapNs(ns: string) {
  return ns && `[${ns}]` || '';
}

function loglog(ns: string, ...args: any[]) {
  outputStreams.log(wrapNs(ns), ...args);
}

// const prettyDebug = makePrettyLog(console.debug, 'gray');
function logDebug(ns: string, ...args: any[]) {
  // color decoration
  // prettyDebug(wrapNs(ns), ...args);

  // no color
  outputStreams.debug(wrapNs(ns), ...args);
}

function logWarn(ns: string, ...args: any[]) {
  ns = wrapNs(ns);
  outputStreams.warn(ns, ...args);
  // report('warn', ns, ...args);
}

export function logError(ns: string, ...args: any[]) {
  ns = wrapNs(ns);
  outputStreams.error(ns, ...args);
  report('error', ns, ...args);
}

const reportedExceptions = new WeakSet<any>();

export function logException(err: unknown, ns: string, ...args: any[]) {
  if (isPlainObject(err)) {
    if (reportedExceptions.has(err)) {
      logWarn(ns, ...args, `(repeated error: ${
        /* @ts-ignore */
        err?.message || err
      })`);
      return;
    }
    reportedExceptions.add(err);
  }
  else {
    console.warn(`bad call to logException did not provide an Error object as first argument:`, err, ns, ...args);
  }
  logError(ns, ...args, err);
}

function logTrace(ns: string, ...args: any[]) {
  ns = wrapNs(ns);
  outputStreams.trace(ns, ...args);
  report('error', ns, ...args);
}

// ###########################################################################
// setOutputStreams
// ###########################################################################

export function addOutputStreams(newOutputStreams: any, fullErrorStack = true) {
  if (fullErrorStack) {
    // fix up error logging to log Error.stack
    // NOTE: by default, Error.toString() returns only the message for some reason
    const cb = newOutputStreams.error;
    newOutputStreams.error = (...args: any[]) => {
      args = args.map(arg => {
        if (arg instanceof Error) {
          // Note: Error objects are not properly stringified.
          arg = err2String(arg);
        }
        
        if (!isString(arg)) {
          // Convert to string.
          arg = arg + '';
        }

        return arg;
      });
      cb(...args);
    };
  }
  outputStreams = mergeOutputStreams(newOutputStreams);
}
