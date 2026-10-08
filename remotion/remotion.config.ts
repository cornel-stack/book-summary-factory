import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setConcurrency(null); // auto: based on CPU cores
Config.setChromiumOpenGlRenderer("angle");
Config.overrideWebpackConfig((config) => config);
