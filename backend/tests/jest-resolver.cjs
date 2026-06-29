const path = require("path");

module.exports = function resolver(moduleName, options) {
  const { basedir, defaultResolver } = options;

  if (
    moduleName.endsWith(".js") &&
    (moduleName.startsWith("./") || moduleName.startsWith("../")) &&
    !basedir.includes("node_modules")
  ) {
    const tsPath = moduleName.replace(/\.js$/, ".ts");
    try {
      return defaultResolver(tsPath, options);
    } catch {
      // Fall through to default resolution
    }
  }

  return defaultResolver(moduleName, options);
};
