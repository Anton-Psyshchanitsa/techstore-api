import { createHash } from 'node:crypto';
import net from 'node:net';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const SOCKET_TIMEOUT_MS = 1500;
const CATALOG_VERSION_KEY = 'catalog:version';

const sendCommand = (commandPayload: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: env.MEMCACHED_HOST,
      port: env.MEMCACHED_PORT,
    });

    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (err?: Error, result?: Buffer): void => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      if (err) {
        reject(err);
      } else {
        resolve(result ?? Buffer.alloc(0));
      }
    };

    socket.setTimeout(SOCKET_TIMEOUT_MS);

    socket.on('connect', () => {
      socket.write(commandPayload);
    });

    socket.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const text = buffer.toString('utf8');

      if (
        text.endsWith('END\r\n') ||
        text.endsWith('STORED\r\n') ||
        text.endsWith('NOT_STORED\r\n') ||
        text.endsWith('DELETED\r\n') ||
        text.endsWith('NOT_FOUND\r\n') ||
        text.endsWith('OK\r\n') ||
        text.endsWith('ERROR\r\n') ||
        text.startsWith('VERSION ') ||
        text.startsWith('CLIENT_ERROR ') ||
        text.startsWith('SERVER_ERROR ')
      ) {
        finish(undefined, buffer);
      }
    });

    socket.on('timeout', () => {
      finish(new Error('Memcached socket timeout'));
    });

    socket.on('error', (err) => {
      finish(err);
    });

    socket.on('end', () => {
      finish(undefined, Buffer.concat(chunks));
    });
  });
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!env.CACHE_ENABLED) {
    return null;
  }

  try {
    const response = await sendCommand(Buffer.from(`get ${key}\r\n`, 'utf8'));
    const text = response.toString('utf8');

    if (!text.startsWith('VALUE ')) {
      return null;
    }

    const firstLineEnd = text.indexOf('\r\n');
    if (firstLineEnd === -1) {
      return null;
    }

    const headerParts = text.slice(0, firstLineEnd).split(' ');
    const byteLength = Number(headerParts[3]);
    if (!Number.isInteger(byteLength) || byteLength < 0) {
      return null;
    }

    const bodyStartOffset = Buffer.byteLength(text.slice(0, firstLineEnd + 2), 'utf8');
    const rawValue = response
      .subarray(bodyStartOffset, bodyStartOffset + byteLength)
      .toString('utf8');

    return JSON.parse(rawValue) as T;
  } catch (err) {
    logger.warn({ err, key }, 'Memcached GET failed');
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds = env.CACHE_TTL_SECONDS,
): Promise<void> => {
  if (!env.CACHE_ENABLED) {
    return;
  }

  try {
    const serialized = Buffer.from(JSON.stringify(value), 'utf8');
    const header = Buffer.from(
      `set ${key} 0 ${String(ttlSeconds)} ${String(serialized.byteLength)}\r\n`,
      'utf8',
    );
    const payload = Buffer.concat([header, serialized, Buffer.from('\r\n', 'utf8')]);
    await sendCommand(payload);
  } catch (err) {
    logger.warn({ err, key }, 'Memcached SET failed');
  }
};

const getCatalogVersion = async (): Promise<number> => {
  const current = await cacheGet<number>(CATALOG_VERSION_KEY);
  if (typeof current === 'number' && Number.isInteger(current) && current > 0) {
    return current;
  }

  const initialVersion = 1;
  await cacheSet(CATALOG_VERSION_KEY, initialVersion, 86400);
  return initialVersion;
};

export const buildCatalogCacheKey = async (
  query: Record<string, unknown>,
): Promise<string> => {
  const version = await getCatalogVersion();
  const sortedEntries = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  const canonicalQuery = JSON.stringify(sortedEntries);
  const queryHash = createHash('sha256').update(canonicalQuery).digest('hex').slice(0, 32);

  return `products:v${String(version)}:${queryHash}`;
};

export const invalidateCatalogCache = async (): Promise<void> => {
  if (!env.CACHE_ENABLED) {
    return;
  }

  const current = await cacheGet<number>(CATALOG_VERSION_KEY);
  const nextVersion =
    typeof current === 'number' && Number.isInteger(current) && current > 0
      ? current + 1
      : Date.now();

  await cacheSet(CATALOG_VERSION_KEY, nextVersion, 86400);
  logger.debug({ nextVersion }, 'Catalog cache invalidated');
};

export const checkCacheHealth = async (): Promise<'connected' | 'disabled' | 'unreachable'> => {
  if (!env.CACHE_ENABLED) {
    return 'disabled';
  }

  try {
    const response = await sendCommand(Buffer.from('version\r\n', 'utf8'));
    return response.toString('utf8').startsWith('VERSION ')
      ? 'connected'
      : 'unreachable';
  } catch {
    return 'unreachable';
  }
};
