const pino = require("pino");
const { env } = require("../../config/env");

const transport =
  env.nodeEnv === "production"
    ? undefined
    : pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss.l",
          ignore: "pid,hostname",
          singleLine: false,
          levelFirst: true,
        },
      });

const logger = pino(
  {
    name: env.appName,
    level: env.nodeEnv === "production" ? "info" : "debug",
    base: env.nodeEnv === "production" ? undefined : { pid: false, hostname: false },
  },
  transport,
);

module.exports = { logger };
