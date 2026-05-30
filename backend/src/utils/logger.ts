import morgan from "morgan";
import { env } from "../config/env.js";

export const logger = {
  info: (message: string, meta?: object) => {
    console.log(
      JSON.stringify({
        level: "info",
        message,
        ...meta,
        timestamp: new Date().toISOString(),
      }),
    );
  },
  error: (message: string, meta?: object) => {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        ...meta,
        timestamp: new Date().toISOString(),
      }),
    );
  },
  warn: (message: string, meta?: object) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        message,
        ...meta,
        timestamp: new Date().toISOString(),
      }),
    );
  },
};

export const httpLogger = morgan(
  env.NODE_ENV === "production" ? "combined" : "dev",
);
