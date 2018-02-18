import path from "path";
import reactScriptsPaths from "react-scripts/config/paths";
import wrapError from "./wrapError";
// import resolveProjectDirectory from "./resolveProjectDirectory";
import { reactAppRequired } from "./resolvedImports";
// import { reactScriptsPathsModule, reactAppRequired } from "./resolvedImports";

const { getBabelLoader, getLoader } = reactAppRequired;

// Search the module cache for the react-scripts package and resolve the project
// base directory based on its location.
// const projectDirectory = resolveProjectDirectory();

// Switch out the entry point index.js for index.tsx.
// We need to perform the monkey patching on the react-scripts path module
// on import to intercept the preflight checking.
// reactScriptsPathsModule.appIndexJs = require.resolve("src/index.tsx", {
//   paths: [projectDirectory, process.cwd()]
// });
replaceEntryFileExtension();

// Matcher to find JavaScript/JSX loader using getLoader util from
// react-app-rewired. We need to able to locate the script loader to change the
// regular expression for its file name matching.
const scriptsLoaderMatcher = (rule: any) =>
  rule.test &&
  rule.test.toString() === /\.(js|jsx|mjs)$/.toString() &&
  rule.use &&
  rule.use.find((r: any) => r.loader && /babel-loader/.test(r.loader));

// The SVG loader will also need adjusting due to its use of the same preset as
// mentioned above.
const svgLoaderMatcher = (rule: any) =>
  rule.test &&
  rule.test.toString() === /\.svg$/.toString() &&
  rule.use &&
  rule.use.find((r: any) => r.loader && /babel-loader/.test(r.loader));

const rewireTypescript = (config: any) => {
  // eslint-disable-next-line no-param-reassign
  config.resolve.extensions = (config.resolve.extensions || []).concat(
    ".web.ts",
    ".ts",
    ".tsx"
  );

  // Locate the Webpack loader responsible for handling Javascript assets.
  const scriptLoader = getLoader(config.module.rules, scriptsLoaderMatcher);

  if (!scriptLoader) {
    throw new Error(wrapError("Unable to locate scripts loader."));
  }

  // Add TypeScript file extensions to the loader matching.
  scriptLoader.test = /\.(ts|tsx|js|jsx|mjs)$/;

  const babelLoader = getBabelLoader(config.module.rules);

  if (!babelLoader) {
    throw new Error(wrapError("Unable to locate Babel loader."));
  }

  // Replace the babel-preset-react-app preset with the preset rewire from this
  // package. This is done so @babel/preset-flow can be removed.
  babelLoader.options.presets = [path.resolve(__dirname, "rewirePreset")];

  // Replace the preset in the SVG loader for the same reason as above.
  const svgLoader = getLoader(config.module.rules, svgLoaderMatcher);

  if (svgLoader) {
    const svgBabelLoader = svgLoader.use.find((l: any) =>
      /babel-loader/.test(l.loader)
    );
    svgBabelLoader.options.presets = babelLoader.options.presets;
  }

  return config;
};

export default rewireTypescript;

function replaceEntryFileExtension() {
  console.log(reactScriptsPaths.appIndexJs);
  reactScriptsPaths.appIndexJs = reactScriptsPaths.appIndexJs.replace(
    /src[\\\/]index.js$/,
    `src${path.sep}index.tsx`
  );
  console.log(reactScriptsPaths.appIndexJs);
}