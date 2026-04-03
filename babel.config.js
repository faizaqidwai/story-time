module.exports = function (api) {
  api.cache(true);

  const envFile = process.env.APP_ENV ? `.env.${process.env.APP_ENV}` : ".env";
  console.log(`Loading env file: ${envFile}`);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env", // ← always load .env, no dynamic switching
          safe: false,
          allowUndefined: false,
        },
      ],
      "react-native-reanimated/plugin", // must always be last
    ],
  };
};
