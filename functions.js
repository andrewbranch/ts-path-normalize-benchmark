import { CharacterCodes, combinePaths, directorySeparator, ensureTrailingDirectorySeparator, getRootLength, hasTrailingDirectorySeparator, normalizeSlashes, removeTrailingDirectorySeparator } from "typescript";

const relativePathSegmentRegExp = /\/\/|(?:^|\/)\.\.?(?:$|\/)/;
const slashDotSlash = /\/\.\//g;
const leadingDotSlash = /^\.\//;

/** @param {string} path */
export function normalizePath(path) {
  path = normalizeSlashes(path);
  const simpleNormalized = simpleNormalizePath(path);
  if (simpleNormalized !== undefined) {
      return simpleNormalized;
  }
  const normalized = getNormalizedAbsolutePath(path, undefined);
  return normalized && hasTrailingDirectorySeparator(path) ? ensureTrailingDirectorySeparator(normalized) : normalized;
}

/** @param {string} path */
function simpleNormalizePath(path) {
  // Most paths don't require normalization
  if (!relativePathSegmentRegExp.test(path)) {
    return path;
  }
  // Some paths only require cleanup of `/./` or leading `./`
  const simplified = path.replace(slashDotSlash, "/").replace(leadingDotSlash, "");
  if (simplified !== path) {
      path = simplified;
      if (!relativePathSegmentRegExp.test(path)) {
          return path;
      }
  }
}

/**
 * @param {string} path
 * @param {string | undefined} currentDirectory
 */
export function getNormalizedAbsolutePath(path, currentDirectory) {
  let rootLength = getRootLength(path);
  if (rootLength === 0 && currentDirectory) {
      path = combinePaths(currentDirectory, path);
      rootLength = getRootLength(path);
  } else {
      path = normalizeSlashes(path);
  }

  const simpleNormalized = simpleNormalizePath(path);
  if (simpleNormalized !== undefined) {
      return simpleNormalized;
  }

  const root = path.substring(0, rootLength);
  const length = path.length;
  // `normalized` is only initialized once `path` is determined to be non-normalized
  let normalized = undefined;
  let index = rootLength;
  let segmentStart = index;
  let normalizedUpTo = index;
  let seenNonDotDotSegment = rootLength !== 0;
  while (index < length) {
      // At beginning of segment
      segmentStart = index;
      let ch = path.charCodeAt(index);
      while (ch === CharacterCodes.slash && index + 1 < length) {
          index++;
          ch = path.charCodeAt(index);
      }
      if (index > segmentStart) {
          // Seen superfluous separator
          normalized ??= path.substring(0, segmentStart - 1);
          segmentStart = index;
      }
      // Past any superfluous separators
      let segmentEnd = path.indexOf(directorySeparator, index + 1);
      if (segmentEnd === -1) {
          segmentEnd = length;
      }
      const segmentLength = segmentEnd - segmentStart;
      if (segmentLength === 1 && path.charCodeAt(index) === CharacterCodes.dot) {
          // "." segment (skip)
          normalized ??= path.substring(0, normalizedUpTo);
      }
      else if (segmentLength === 2 && path.charCodeAt(index) === CharacterCodes.dot && path.charCodeAt(index + 1) === CharacterCodes.dot) {
          // ".." segment
          if (!seenNonDotDotSegment) {
              if (normalized !== undefined) {
                  normalized += normalized.length === rootLength ? ".." : "/..";
              }
              else {
                  normalizedUpTo = index + 2;
              }
          }
          else if (normalized === undefined) {
              if (normalizedUpTo - 2 >= 0) {
                  normalized = path.substring(0, Math.max(rootLength, path.lastIndexOf(directorySeparator, normalizedUpTo - 2)));
              }
              else {
                  normalized = path.substring(0, normalizedUpTo);
              }
          }
          else {
              const lastSlash = normalized.lastIndexOf(directorySeparator);
              if (lastSlash !== -1) {
                  normalized = normalized.substring(0, Math.max(rootLength, lastSlash));
              }
              else {
                  normalized = root;
              }
              if (normalized.length === rootLength) {
                  seenNonDotDotSegment = rootLength !== 0;
              }
          }
      }
      else if (normalized !== undefined) {
          if (normalized.length !== rootLength) {
              normalized += directorySeparator;
          }
          seenNonDotDotSegment = true;
          normalized += path.substring(segmentStart, segmentEnd);
      }
      else {
          seenNonDotDotSegment = true;
          normalizedUpTo = segmentEnd;
      }
      index = segmentEnd + 1;
  }
  return normalized ?? (length > rootLength ? removeTrailingDirectorySeparator(path) : path);
}
