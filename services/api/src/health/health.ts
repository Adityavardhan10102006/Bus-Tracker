export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
}

export interface ReadinessStatus {
  status: 'ok' | 'unready';
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export interface VersionInfo {
  version: string;
  environment: string;
  service: string;
  timestamp: string;
}

const startTime = Date.now();

export function getLivenessStatus(): HealthStatus {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };
}

export async function checkDatabaseConnection(databaseUrl?: string): Promise<boolean> {
  const urlString = databaseUrl || process.env.DATABASE_URL;
  if (!urlString) return false;

  try {
    const url = new URL(urlString);
    const host = url.hostname || 'localhost';
    const port = Number(url.port) || 5432;

    const net = await import('node:net');
    return await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1500);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });
  } catch {
    return false;
  }
}

export async function getReadinessStatus(
  checkDatabase?: () => Promise<boolean>,
): Promise<ReadinessStatus> {
  let isDbOk = true;

  if (checkDatabase) {
    try {
      isDbOk = await checkDatabase();
    } catch {
      isDbOk = false;
    }
  }

  return {
    status: isDbOk ? 'ok' : 'unready',
    database: isDbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };
}

export function getVersionInfo(appEnv = 'local'): VersionInfo {
  return {
    version: '1.0.0-foundation',
    environment: appEnv,
    service: 'vjit-bus-tracker-api',
    timestamp: new Date().toISOString(),
  };
}
