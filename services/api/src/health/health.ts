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
