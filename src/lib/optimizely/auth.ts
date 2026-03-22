/**
 * OAuth Token Utility for Optimizely CMS Management API.
 *
 * The Management API requires a short-lived JWT obtained via the
 * OAuth 2.0 client_credentials flow. Tokens expire after 300 seconds.
 * This module caches the token in-memory and refreshes it 30 seconds
 * before expiry to avoid mid-request failures.
 */

interface TokenCache {
  token: string;
  expiresAt: number;
}

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

let tokenCache: TokenCache | null = null;

const EXPIRY_BUFFER_MS = 30_000;
const TOKEN_ENDPOINT = "https://api.cms.optimizely.com/oauth/token";

/**
 * Fetch a management API token using client_credentials grant.
 * Returns a cached token if one exists and is still valid.
 */
export async function getManagementToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt > now + EXPIRY_BUFFER_MS) {
    return tokenCache.token;
  }

  const clientId = process.env.OPTIMIZELY_APP_KEY;
  const clientSecret = process.env.OPTIMIZELY_APP_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "OPTIMIZELY_APP_KEY and OPTIMIZELY_APP_SECRET must be set for management API calls"
    );
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to obtain Optimizely management token: ${response.status} ${errorBody}`
    );
  }

  const data: OAuthTokenResponse = await response.json();

  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return tokenCache.token;
}
