export function normalizeCorsOrigin(
  configuredOrigin: string,
  _port: number,
): boolean | string {
  const trimmedOrigin = configuredOrigin.trim();
  if (trimmedOrigin === '') return false;
  if (trimmedOrigin === '*') {
    return true;
  }
  if (/^https?:\/\//i.test(trimmedOrigin)) {
    return trimmedOrigin;
  }
  return `http://${trimmedOrigin}`;
}

export function buildCorsOptions(
  configuredOrigin: string,
  port: number,
): { origin: boolean | string; methods: string[]; credentials: true } {
  return {
    origin: normalizeCorsOrigin(configuredOrigin, port),
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  };
}
