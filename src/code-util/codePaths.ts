import fs, { EncodingOption } from 'fs';
import path from 'path';
import { ColorThemeKind, window } from 'vscode';
import currentContext from './currentExtensionContext';

export function realPathSyncNormalized(fpath: string, options?: EncodingOption) {
  return pathNormalized(fs.realpathSync(fpath, options));
}

export function pathResolve(...paths: string[]) {
  return pathNormalized(path.resolve(...paths));
}

/**
 * @param  {...string} paths 
 * @returns {string}
 */
export function pathJoin(...paths: string[]) {
  return pathNormalized(path.join(...paths));
}

/**
 * @param {*} from Usually the shorter (potential parent/folder) path.
 * @param {*} to The (usually) more concrete file path.
 */
export function pathRelative(from: string, to: string) {
  from = pathNormalized(from);
  to = pathNormalized(to);
  const sep = '/';
  if (!from.endsWith(sep)) { from += '/'; }
  if (!to.endsWith(sep)) { to += '/'; }
  return pathNormalized(path.relative(from, to));
}


/**
 * It appears, VSCode is now not normalizing or normalizing to lower-case drive letter (e.g. in Uri.fspath!!!):
 * @see https://code.visualstudio.com/api/references/vscode-api#Uri 
 * @see https://github.com/microsoft/vscode/issues/45760#issuecomment-373417966
 * @see https://github.com/microsoft/vscode/blob/94c9ea46838a9a619aeafb7e8afd1170c967bb55/test/unit/coverage.js#L81
 * 
 * Before that (in 2016), they decided for upper-case drive letters:
 * @see https://github.com/microsoft/vscode/issues/9448
 * @see https://github.com/microsoft/vscode/commit/a6c845baf7fed4a186e3b744c5c14c0be53494fe
 */
export function normalizeDriveLetter(fpath: string) {
  if (fpath && fpath[1] === ':') {
    fpath = fpath[0].toUpperCase() + fpath.substr(1);
  }
  return fpath;
}

export function pathNormalized(fpath: string) {
  return fpath.replace(/\\/g, '/');
}

/**
 * In addition to standard normalization, also enforces upper-case drive letter.
 */
export function pathNormalizedForce(fpath: string) {
  return normalizeDriveLetter(pathNormalized(fpath));
}

export function getThemeKindName(kind: ColorThemeKind) {
  return (kind == ColorThemeKind.HighContrast || kind == ColorThemeKind.Dark) ? "dark" : "light";
}

export function asAbsolutePath(fpath: string) {
  return pathNormalizedForce(currentContext().asAbsolutePath(fpath));
}

export function getResourcePath(...relativePathSegments: string[]) {
  return asAbsolutePath(pathJoin('resources', ...relativePathSegments));
}

export function getThemeResourcePath(...relativePathSegments: string[]) {
  const theme = getThemeKindName(window.activeColorTheme.kind);
  return getResourcePath(theme, ...relativePathSegments);
}

export function getThemeResourceConfig(...relativePathSegments: string[]) {
  return {
    light: getResourcePath('light', ...relativePathSegments),
    dark: getResourcePath('dark', ...relativePathSegments)
  };
}
