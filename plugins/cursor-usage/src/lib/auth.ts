import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ACCESS_TOKEN_KEYS = ["cursorAuth/accessToken", "cursorAuth/token"] as const;
const REFRESH_TOKEN_KEY = "cursorAuth/refreshToken";
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
const SQLITE_TABLES = ["ItemTable", "cursorDiskKV"] as const;
const MAX_SQLITE_DB_BYTES = 50 * 1024 * 1024;
const RAW_SCAN_CHUNK_BYTES = 4 * 1024 * 1024;
const RAW_SCAN_OVERLAP_BYTES = 4096;

export type CursorCredentials = {
  accessToken: string;
  refreshToken?: string;
  dbPath: string;
  sessionCookie?: string;
};

export type ParsedTokenInput = {
  bearerToken: string;
  sessionCookie: string;
};

function extractJwtSub(token: string): string | undefined {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return undefined;
    }

    let payload = parts[1];
    while (payload.length % 4 !== 0) {
      payload += "=";
    }

    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { sub?: string };

    return typeof decoded.sub === "string" ? decoded.sub : undefined;
  } catch {
    return undefined;
  }
}

export function parseTokenInput(rawInput: string): ParsedTokenInput {
  let trimmed = rawInput.trim().replace(/^["']|["']$/g, "");

  if (trimmed.startsWith("WorkosCursorSessionToken=")) {
    trimmed = trimmed.slice("WorkosCursorSessionToken=".length);
  }

  if (trimmed.includes("%3A%3A") || trimmed.includes("::")) {
    const decoded = decodeURIComponent(trimmed);
    const separator = decoded.includes("::") ? "::" : "%3A%3A";
    const parts = decoded.split(separator);
    const userId = parts[0]?.trim();
    const jwt = parts.slice(1).join(separator).trim();

    if (jwt) {
      const sessionCookie = trimmed.includes("%3A%3A")
        ? trimmed
        : `${userId}%3A%3A${jwt}`;
      return { bearerToken: jwt, sessionCookie };
    }
  }

  const sub = extractJwtSub(trimmed);
  const sessionCookie = sub ? `${sub}%3A%3A${trimmed}` : trimmed;
  return { bearerToken: trimmed, sessionCookie };
}

function resolveHomeDir(): string {
  if (process.platform === "win32") {
    return process.env.USERPROFILE || process.env.HOME || os.homedir();
  }

  return process.env.HOME || os.homedir();
}

function getWindowsAppDataPath(): string {
  if (process.env.APPDATA?.trim()) {
    return process.env.APPDATA;
  }

  return path.join(resolveHomeDir(), "AppData", "Roaming");
}

export function getStateDbCandidates(): string[] {
  const home = resolveHomeDir();

  if (process.platform === "win32") {
    const appData = getWindowsAppDataPath();

    return [
      path.join(appData, "Cursor", "User", "globalStorage", "state.vscdb"),
      path.join(appData, "Cursor - Insiders", "User", "globalStorage", "state.vscdb"),
    ];
  }

  if (process.platform === "darwin") {
    return [
      path.join(
        home,
        "Library",
        "Application Support",
        "Cursor",
        "User",
        "globalStorage",
        "state.vscdb",
      ),
      path.join(
        home,
        "Library",
        "Application Support",
        "Cursor - Insiders",
        "User",
        "globalStorage",
        "state.vscdb",
      ),
    ];
  }

  return [
    path.join(home, ".config", "Cursor", "User", "globalStorage", "state.vscdb"),
    path.join(home, ".config", "cursor", "User", "globalStorage", "state.vscdb"),
  ];
}

function getDbFileStat(dbPath: string): fs.Stats | undefined {
  try {
    const stat = fs.statSync(dbPath);
    return stat.isFile() ? stat : undefined;
  } catch {
    return undefined;
  }
}

function getUsableDbCandidates(): Array<{ path: string; size: number }> {
  return getStateDbCandidates()
    .map((candidate) => {
      const stat = getDbFileStat(candidate);
      return stat ? { path: candidate, size: stat.size } : undefined;
    })
    .filter((entry): entry is { path: string; size: number } => entry !== undefined);
}

export function getStateDbPath(): string {
  return getUsableDbCandidates()[0]?.path ?? getStateDbCandidates()[0];
}

function normalizeStateValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return typeof parsed === "string" ? parsed : trimmed;
  } catch {
    return trimmed;
  }
}

function decodeRawValue(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.length > 0) {
    return normalizeStateValue(raw);
  }

  if (raw instanceof Uint8Array && raw.length > 0) {
    return normalizeStateValue(Buffer.from(raw).toString("utf8"));
  }

  return undefined;
}

function extractValueNearMarker(slice: string, key: string): string | undefined {
  const jwtMatch = slice.match(JWT_PATTERN);
  if (jwtMatch) {
    return jwtMatch[0];
  }

  if (key === REFRESH_TOKEN_KEY) {
    const quoted = slice.match(/"([^"]{20,})"/);
    if (quoted) {
      return normalizeStateValue(quoted[1]);
    }
  }

  return undefined;
}

function tryGetValueFromRawDb(dbPath: string, key: string): string | undefined {
  const marker = Buffer.from(key, "utf8");
  const chunk = Buffer.alloc(RAW_SCAN_CHUNK_BYTES);
  let fileOffset = 0;
  let carry = Buffer.alloc(0);

  let fd: number | undefined;
  try {
    fd = fs.openSync(dbPath, "r");
    const { size } = fs.fstatSync(fd);

    while (fileOffset < size) {
      const bytesToRead = Math.min(RAW_SCAN_CHUNK_BYTES, size - fileOffset);
      const bytesRead = fs.readSync(fd, chunk, 0, bytesToRead, fileOffset);
      if (bytesRead <= 0) {
        break;
      }

      const window = Buffer.concat([carry, chunk.subarray(0, bytesRead)]);
      let start = 0;

      while (start < window.length) {
        const idx = window.indexOf(marker, start);
        if (idx === -1) {
          break;
        }

        const slice = window.subarray(idx, Math.min(idx + 4096, window.length)).toString("utf8");
        const value = extractValueNearMarker(slice, key);
        if (value) {
          return value;
        }

        start = idx + 1;
      }

      carry =
        window.length > RAW_SCAN_OVERLAP_BYTES
          ? window.subarray(window.length - RAW_SCAN_OVERLAP_BYTES)
          : window;
      fileOffset += bytesRead;
    }
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }

  return undefined;
}

function readDbBytes(dbPath: string): Uint8Array {
  const stat = getDbFileStat(dbPath);
  if (!stat) {
    throw new Error(`Cursor state database is not readable: ${dbPath}`);
  }

  if (stat.size > MAX_SQLITE_DB_BYTES) {
    throw new Error(
      `Cursor state database is too large (${stat.size} bytes) at ${dbPath}. Use manual Access Token.`,
    );
  }

  return new Uint8Array(fs.readFileSync(dbPath));
}

async function readStateValue(dbPath: string, key: string): Promise<string | undefined> {
  const stat = getDbFileStat(dbPath);
  if (!stat || stat.size > MAX_SQLITE_DB_BYTES) {
    return undefined;
  }

  const pluginDir = path.dirname(fileURLToPath(import.meta.url));
  const wasmPath = path.join(pluginDir, "sql-wasm.wasm");

  if (!fs.existsSync(wasmPath)) {
    throw new Error("sql-wasm.wasm is missing from the plugin install.");
  }

  const sqlJsMod = await import("sql.js");
  type InitSqlJs = (opts?: {
    wasmBinary?: Buffer | Uint8Array;
    locateFile?: (file: string) => string;
  }) => Promise<import("sql.js").SqlJsStatic>;

  const initSqlJs: InitSqlJs =
    typeof (sqlJsMod as { default?: InitSqlJs }).default === "function"
      ? (sqlJsMod as { default: InitSqlJs }).default
      : (sqlJsMod as unknown as InitSqlJs);

  const SQL = await initSqlJs({
    wasmBinary: fs.readFileSync(wasmPath),
  });

  const db = new SQL.Database(readDbBytes(dbPath));

  try {
    for (const table of SQLITE_TABLES) {
      try {
        const stmt = db.prepare(`SELECT value FROM ${table} WHERE key = ? LIMIT 1`);
        stmt.bind([key]);
        if (!stmt.step()) {
          stmt.free();
          continue;
        }

        const row = stmt.getAsObject() as { value?: string | Uint8Array };
        stmt.free();
        const decoded = decodeRawValue(row.value);
        if (decoded) {
          return decoded;
        }
      } catch {
        // Try the next table name.
      }
    }
  } finally {
    db.close();
  }

  return undefined;
}

async function readCredentialsFromDb(
  dbPath: string,
  size: number,
): Promise<CursorCredentials | undefined> {
  let accessToken: string | undefined;

  for (const key of ACCESS_TOKEN_KEYS) {
    accessToken = tryGetValueFromRawDb(dbPath, key);
    if (accessToken) {
      break;
    }
  }

  if (!accessToken && size <= MAX_SQLITE_DB_BYTES) {
    for (const key of ACCESS_TOKEN_KEYS) {
      accessToken = await readStateValue(dbPath, key);
      if (accessToken) {
        break;
      }
    }
  }

  if (!accessToken) {
    return undefined;
  }

  let refreshToken = tryGetValueFromRawDb(dbPath, REFRESH_TOKEN_KEY);
  if (!refreshToken && size <= MAX_SQLITE_DB_BYTES) {
    refreshToken = await readStateValue(dbPath, REFRESH_TOKEN_KEY);
  }

  return {
    accessToken,
    refreshToken,
    dbPath,
  };
}

function isTokenExpired(token: string): boolean {
  return getJwtExpiry(token).expired;
}

export function getJwtExpiry(token: string): { expired: boolean; expiresAt?: Date } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { expired: false };
    }

    let payload = parts[1];
    while (payload.length % 4 !== 0) {
      payload += "=";
    }

    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { exp?: number };

    if (typeof decoded.exp !== "number") {
      return { expired: false };
    }

    const expiresAt = new Date(decoded.exp * 1000);
    return { expired: Date.now() >= expiresAt.getTime(), expiresAt };
  } catch {
    return { expired: false };
  }
}

export function assertCredentialsFresh(credentials: CursorCredentials): void {
  const { expired, expiresAt } = getJwtExpiry(credentials.accessToken);
  if (!expired) {
    return;
  }

  if (credentials.refreshToken) {
    return;
  }

  const when = expiresAt ? expiresAt.toISOString() : "unknown time";
  throw new Error(`Cursor session token expired at ${when}. Sign in again at cursor.com and in Cursor IDE.`);
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch("https://api2.cursor.sh/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Cursor token refresh failed (${response.status}). Re-login to Cursor.`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    shouldLogout?: boolean;
  };

  if (data.shouldLogout || !data.access_token) {
    throw new Error("Cursor session expired. Re-login to Cursor.");
  }

  return data.access_token;
}

export async function resolveCursorCredentials(
  manualToken?: string,
  manualRefreshToken?: string,
): Promise<CursorCredentials> {
  if (manualToken?.trim()) {
    const parsed = parseTokenInput(manualToken);
    return {
      accessToken: parsed.bearerToken,
      refreshToken: manualRefreshToken?.trim() || undefined,
      dbPath: getStateDbPath(),
      sessionCookie: parsed.sessionCookie,
    };
  }

  const candidates = getUsableDbCandidates();
  if (candidates.length === 0) {
    throw new Error(
      "Cursor state database not found. Make sure Cursor is installed and you are logged in.",
    );
  }

  const failures: string[] = [];

  for (const candidate of candidates) {
    try {
      const credentials = await readCredentialsFromDb(candidate.path, candidate.size);
      if (!credentials) {
        failures.push(`${candidate.path} (${candidate.size} bytes): token not found`);
        continue;
      }

      if (credentials.refreshToken && isTokenExpired(credentials.accessToken)) {
        credentials.accessToken = await refreshAccessToken(credentials.refreshToken);
      }

      return credentials;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      failures.push(`${candidate.path}: ${message}`);
    }
  }

  throw new Error(
    failures.join(" | ") ||
      "Access token not found in Cursor state database. Are you logged into Cursor?",
  );
}

export async function getAccessToken(manualToken?: string): Promise<string> {
  const credentials = await resolveCursorCredentials(manualToken);
  return credentials.accessToken;
}
