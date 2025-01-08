import { getNormalizedAbsolutePath as ts_getNormalizedAbsolutePath, normalizePath as ts_normalizePath } from "typescript";

/** @param {string} path */
export function normalizePath(path) {
  return ts_normalizePath(path);
}

/**
 * @param {string} fileName
 * @param {string | undefined} currentDirectory
 */
export function getNormalizedAbsolutePath(fileName, currentDirectory) {
  return ts_getNormalizedAbsolutePath(fileName, currentDirectory);
}
