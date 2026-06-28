/**
 * OmniQ shared package - structured logger.
 * Author: OmniQ Team
 */
import winston from "winston";

export function createLogger(service: string) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    defaultMeta: { service },
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.Console()]
  });
}
