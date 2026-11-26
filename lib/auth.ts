let accessToken: string | null = null;

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!configuredUrl) {
    const defaultUrl =
      process.env.NODE_ENV === "production"
        ? "https://al-movie.onrender.com"
        : "http://localhost:8000";
    return new URL(defaultUrl);
  }

  return new URL(configuredUrl);
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}
