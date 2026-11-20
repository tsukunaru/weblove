const pagesPath = process.env.PAGES_BASE_PATH;

export default {
  devIndicators: false,
  ...(pagesPath && { output: "export", basePath: pagesPath, trailingSlash: true }),
};
