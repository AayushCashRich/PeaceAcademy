import pino, { Logger } from "pino"

export function getLogLevel(): string {
	return process.env.PINO_LOG_LEVEL || "info"
}

export function getLogger(): Logger {
	return pino({ level: getLogLevel() })
}

const logger = getLogger()

export default logger