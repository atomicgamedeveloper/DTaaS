import { type CorsAllowOrigin } from './config.interface.js';

function normalizeSingleOrigin(configuredOrigin: string): string {
  const trimmedOrigin = configuredOrigin.trim();
  if (/^https?:\/\//i.test(trimmedOrigin)) return trimmedOrigin;
  return `http://${trimmedOrigin}`;
}

export function normalizeCorsOrigin(
  configuredOrigin: CorsAllowOrigin,
  _port: number,
): boolean | string | string[] {
  if (Array.isArray(configuredOrigin)) {
    return configuredOrigin.map(normalizeSingleOrigin);
  }
  const trimmedOrigin = configuredOrigin.trim();
  if (trimmedOrigin === '') return false;
  if (trimmedOrigin === '*') return true;
  return normalizeSingleOrigin(trimmedOrigin);
}

export function buildCorsOptions(
  configuredOrigin: CorsAllowOrigin,
  port: number,
): {
  origin: boolean | string | string[];
  methods: string[];
  credentials: true;
} {
  return {
    origin: normalizeCorsOrigin(configuredOrigin, port),
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  };
}
