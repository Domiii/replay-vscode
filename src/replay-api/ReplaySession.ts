
/**
 * NYI: In theory, one can have multiple sessions open at the same time.
 * However, there are multiple problems with that:
 * 1. One session can produce multiple views of the same file,
 *    but we only want one editor per file.
 * 2. The suspense caches are singletons. While they usually do have a
 *    `client` parameter, the `client` is also treated as a singleton by
 *    the devtools utilities, so that would need to be tested first.
 */
// export class ReplaySession {
// }
