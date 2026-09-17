import * as SecureStore from "expo-secure-store";

const REFRESH_KEY = "orokia_refresh_token";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setStoredRefreshToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(REFRESH_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  }
}
