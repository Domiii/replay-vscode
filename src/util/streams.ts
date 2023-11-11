/* Copyright 2023 Record Replay Inc. */

import stream, { Readable, Duplex, Transform } from "stream";
import { StringDecoder } from "string_decoder";
import pump from "pump";
import { promisify } from "util";

const LINE_END_RE = /\r\n?|\n/;

export const finished = promisify(stream.finished);

/**
 * Given a readable stream, pipe it through the transform streams,
 * returning a new readable stream.
 */
export function composeStreams(input: Readable, ...transform: Array<Duplex>): Readable {
  // There's a bug in `stream.compose` that does not properly preserve
  // readableObjectMode from the final stream into the returned stream, so we're
  // going with `pump` for now.
  return pump(input, ...transform) as Readable;
}

/**
 * Wrap the stream's normal iterable behavior such that it throws
 * if the stream is destroyed before all data has been read from it.
 *
 * An iterable created directly from a stream will silently consider
 * itself done if the stream is destroyed before explicitly being ended,
 * which is a data-loss risk and risks writing partial data.
 */
export async function* streamToValueIterator(
  stream: Readable
): AsyncIterableIterator<unknown> {
  const end = finished(stream);
  // Avoid warnings if the loop throws an error and nothing ever awaits
  // the 'end' promise.
  end.catch(() => {});

  for await (const chunk of stream) {
    yield chunk;
  }

  // The loop itself doesn't currently throw if a stream is destroyed before
  // emitting 'end', so we explicitly wait for the promise here so that if
  // the stream was destroyed, this will throw. If eventually node changes
  // the async iterator to throw, then we won't need this anymore.
  await end;
}

/**
 * Provide a simple wrapper for Buffer iterables.
 */
export async function* streamToIterator(stream: Readable): AsyncIterableIterator<Buffer> {
  for await (const chunk of streamToValueIterator(stream)) {
    yield chunk as Buffer;
  }
}


/**
 * Create an iterable to process a stream one line at a time.
 */
export function streamToLineIterator(stream: Readable): AsyncIterableIterator<string> {
  return iterableToLineIterator(streamToIterator(stream));
}
export async function* iterableToLineIterator(
  iterable: AsyncIterableIterator<Buffer>
): AsyncIterableIterator<string> {
  const readable = Readable.from(iterable);
  const lines = composeStreams(readable, split()) as Readable;
  yield* lines;
}

/**
/* A transform to split a stream into lines. This will handle cross-platform
 * newline sequences properly, even if they fall on chunk boundaries.
 */
export function split(): Transform {
  let buffered = "";
  const decoder = new StringDecoder("utf8");
  let endedInCarriageReturn = false;

  return new Transform({
    readableObjectMode: true,
    transform(chunk: Buffer, _encoding, callback) {
      let asString = decoder.write(chunk);
      const startsWithNewline = asString.startsWith("\n");
      if (endedInCarriageReturn && startsWithNewline) {
        asString = asString.slice(1);
      }
      const lines = asString.split(LINE_END_RE);
      if (lines.length > 1) {
        lines[0] = buffered + lines[0];
        buffered = "";
      }
      buffered += lines.pop()!;
      lines.forEach(part => this.push(part));
      endedInCarriageReturn = asString.endsWith("\r");
      callback();
    },
    flush(callback) {
      const end = buffered + decoder.end();
      if (end.length) {
        this.push(end);
      }
      callback();
    },
  });
}
