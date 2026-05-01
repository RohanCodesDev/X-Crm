export function getApiBaseUrl() {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBase) {
    return configuredBase.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }

  return '';
}