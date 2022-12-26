({
    appDir: "../",
    baseUrl: "js",
    dir: "../../timeline-build",
    mainConfigFile: "main.js",
    keepBuildDir: false,
    optimize: "",
    skipDirOptimize: true,
    optimizeCss: "standard",
    removeCombined: true,
    fileExclusionRegExp: /(^\.)|(^scss)|(^data.*\.json$)|(^tests)|(^config.codekit)/,

    modules: [
        {
            name: "main"
        }
    ]
})
