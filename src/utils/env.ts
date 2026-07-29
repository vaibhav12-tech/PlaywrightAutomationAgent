export type Environment = 'dev' | 'qa' | 'prod';

export function getEnv(): Environment {
  const env = (process.env.TEST_ENV || 'dev').toLowerCase();
  if (env === 'qa' || env === 'prod') return env;
  return 'dev';
}
