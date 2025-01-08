import { getNormalizedAbsolutePath as ts_getNormalizedAbsolutePath, normalizePath as ts_normalizePath } from "typescript";
import { getNormalizedAbsolutePath as new_getNormalizedAbsolutePath, normalizePath as new_normalizePath } from "./functions.js";
import { Suite } from "bench-node";
import { readdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import readline from "node:readline";

{
  const suiteName = "non-normalized inputs";
  /** @type {[string, string][]} */
  const inputs = [
    ["/.", ""],
    ["/./", ""],
    ["/../", ""],
    ["/a/", ""],
    ["/a/.", ""],
    ["/a/foo.", ""],
    ["/a/./", ""],
    ["/a/./b", ""],
    ["/a/./b/", ""],
    ["/a/..", ""],
    ["/a/../", ""],
    ["/a/../", ""],
    ["/a/../b", ""],
    ["/a/../b/", ""],
    ["/a/..", ""],
    ["/a/..", "/"],
    ["/a/..", "b/"],
    ["/a/..", "/b"],
    ["/a/.", "b"],
    ["/a/.", "."],
  ];
  createSuite(`getNormalizedAbsolutePath - ${suiteName}`, inputs, ts_getNormalizedAbsolutePath, new_getNormalizedAbsolutePath);
  createSuite(`normalizePath - ${suiteName}`, inputs, ts_normalizePath, new_normalizePath);
}

{
  const suiteName = "normalized inputs";
  /** @type {[string, string][]} */
  const inputs = [
    ["/a/b", ""],
    ["/one/two/three", ""],
    ["/users/root/project/src/foo.ts", ""],
  ];
  createSuite(`getNormalizedAbsolutePath - ${suiteName}`, inputs, ts_getNormalizedAbsolutePath, new_getNormalizedAbsolutePath);
  createSuite(`normalizePath - ${suiteName}`, inputs, ts_normalizePath, new_normalizePath);
}

{
  const suiteName = "normalized inputs (long)";
  /** @type {[string, string][]} */
  const inputs = [
    ["/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z", ""],
    ["/one/two/three/four/five/six/seven/eight/nine/ten/eleven/twelve/thirteen/fourteen/fifteen/sixteen/seventeen/eighteen/nineteen/twenty", ""],
    ["/users/root/project/src/foo/bar/baz/qux/quux/corge/grault/garply/waldo/fred/plugh/xyzzy/thud", ""],
    ["/lorem/ipsum/dolor/sit/amet/consectetur/adipiscing/elit/sed/do/eiusmod/tempor/incididunt/ut/labore/et/dolore/magna/aliqua/ut/enim/ad/minim/veniam", ""],
  ];
  createSuite(`getNormalizedAbsolutePath - ${suiteName}`, inputs, ts_getNormalizedAbsolutePath, new_getNormalizedAbsolutePath);
  createSuite(`normalizePath - ${suiteName}`, inputs, ts_normalizePath, new_normalizePath);
}

if (!process.argv.includes("--skip-json")) {
  const suites = await readdir("suites");
  for (const suiteName of suites) {
    const scenario = await jsonScenario(suiteName);
    const suite = new Suite();
    suite.add(`ts  - ${suiteName}`, scenario(ts_getNormalizedAbsolutePath, ts_normalizePath));
    suite.add(`new - ${suiteName}`, scenario(new_getNormalizedAbsolutePath, new_normalizePath));
    suite.run();
  }
}

/**
 * @param {string} name
 * @param {[string, string][]} inputs
 * @param {typeof ts_getNormalizedAbsolutePath} tsNormalize
 * @param {typeof ts_getNormalizedAbsolutePath} newNormalize
 */
function createSuite(name, inputs, tsNormalize, newNormalize) {
  const suite = new Suite();
  suite.add(`ts  - ${name}`, () => run(tsNormalize));
  suite.add(`new - ${name}`, () => run(newNormalize));
  suite.run();
  /** @param {typeof ts_getNormalizedAbsolutePath} normalize */
  function run(normalize) {
    for (const [path, currentDirectory] of inputs) {
      normalize(path, currentDirectory);
    }
  }
}

/**
 * @param {string} suite
 */
async function jsonScenario(suite) {
  const calls = await collectCalls(suite);
  /**
   * @param {typeof ts_getNormalizedAbsolutePath} getNormalizedAbsolutePath
   * @param {typeof ts_normalizePath} normalizePath
   */
  return (getNormalizedAbsolutePath, normalizePath) => () => {
    for (const call of calls) {
      if (call.call === "normalizePath") {
        normalizePath(call.args[0]);
      } else if (call.call === "getNormalizedAbsolutePath") {
        getNormalizedAbsolutePath(call.args[0], call.args[1]);
      } else {
        throw new Error(`Unknown call: ${call.call}`);
      }
    }
  }
}

/**
 * @param {string} suite
 */
function collectCalls(suite) {
  /** @type {Promise<any[]>} */
  return new Promise((resolve, reject) => {
    /** @type {any[]} */
    const calls = [];
    const readStream = createReadStream(`suites/${suite}`, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity
    });

    rl.on("line", line => calls.push(JSON.parse(line)));
    rl.on("error", reject);
    rl.on("close", () => resolve(calls));
  });
}