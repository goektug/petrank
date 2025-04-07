export function jsonToBase64(obj: Record<string, unknown>): string {
  const json = JSON.stringify(obj);
  return Buffer.from(json).toString("base64");
}

export function base64ToJson<T extends Record<string, unknown>>(str?: string | null): T {
  str = str || '{}';
  const json = Buffer.from(str, 'base64').toString();
  return JSON.parse(json) as T;
}

export interface AuthState extends Record<string, unknown> {
  provider: string;
  next?: string;
  state?: string;
} 