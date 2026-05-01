type RateLimitConfig = {
  enabled: boolean;
  windowSeconds: number;
  maxRequests: number;
};

const parseBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
};

const parseIntEnv = (
  value: string | undefined,
  fallback: number,
  name: string
) => {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

export const getRateLimitConfig = (): RateLimitConfig => {
  return {
    enabled: parseBool(process.env.RATE_LIMIT_ENABLED, true),
    windowSeconds: parseIntEnv(
      process.env.RATE_LIMIT_WINDOW_SECONDS,
      60,
      "RATE_LIMIT_WINDOW_SECONDS"
    ),
    maxRequests: parseIntEnv(
      process.env.RATE_LIMIT_MAX_REQUESTS,
      60,
      "RATE_LIMIT_MAX_REQUESTS"
    ),
  };
};

