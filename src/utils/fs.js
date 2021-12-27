const fs = require(`fs`);
const { join } = require(`path`);

/**
 * Check provided path to see if it resolves to a directory or not
 * @param {fs.PathLike} path The path to check
 * @returns {boolean} Whether the path is a director or not
 */
const isDir = (path) => fs.statSync(path).isDirectory();
/**
 * Check provided path to see if it resolves to a file or not
 * @param {fs.PathLike} path The path to check
 * @returns {boolean} Whether the path is a file or not
 */
const isFile = (path) => fs.statSync(path).isFile();

/**
 * Gets all of the directory URIs for a given path
 * @param {fs.PathLike} path The path we want to extract directories from
 * @returns {Array<fs.PathLike>} An array of directory paths
 */
const getDirs = (path) =>
  fs
    .readdirSync(path)
    .map((name) => join(path.toString(), name))
    .filter(isDir);
/**
 * Gets all of the file URIs for a given path
 * @param {fs.PathLike} path The path we want to extract files from
 * @returns {Array<fs.PathLike>} An array of file paths
 */
const getFiles = (path) =>
  fs
    .readdirSync(path)
    .map((name) => join(path.toString(), name))
    .filter(isFile);

/**
 * Recursively extract all of the absolute file URIs for a given root directory
 * @param {fs.PathLike} path The root of of the path we want to recursively extract all of the file URIs from
 * @returns {Array<fs.PathLike>} An array of fully qualified/absolute file URIs for the given root directory
 * and sub-directories
 */
const getFilesRecursively = (path) => {
  const dirs = getDirs(path.toString());
  const files = dirs.flatMap((dir) => getFilesRecursively(dir));
  return [...files, ...getFiles(path)];
};

module.exports = {
  getFilesRecursively,
};
