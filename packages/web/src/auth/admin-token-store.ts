let adminAccessToken: string | null = null;

export function getAdminAccessToken(): string | null {
  return adminAccessToken;
}

export function setAdminAccessToken(token: string | null): void {
  adminAccessToken = token;
}
