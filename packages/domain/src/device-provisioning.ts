import crypto from 'node:crypto';
import type { UserRole, DeviceRecord } from '@vjit/contracts';

export interface MaskedDeviceRecord extends Omit<DeviceRecord, 'imei' | 'iccid'> {
  imei: string;
  iccid: string;
  isMasked: boolean;
  notYetConnectedWarning: boolean;
}

/**
 * Masks IMEI and ICCID according to user role per Spec 16.4, 16.5 & Task P4-T2:
 * - Unmasked for Super Admin (SAD) only
 * - Masked to last four digits for Coordinator (COR) and Technician (TEC)
 */
export function maskDeviceRecord(device: DeviceRecord, viewerRole: UserRole, now = new Date()): MaskedDeviceRecord {
  const isSuperAdmin = viewerRole === 'SAD';
  
  const imei = isSuperAdmin
    ? device.imei
    : `${'*'.repeat(Math.max(0, device.imei.length - 4))}${device.imei.slice(-4)}`;

  const iccid = isSuperAdmin
    ? device.iccid
    : `${'*'.repeat(Math.max(0, device.iccid.length - 4))}${device.iccid.slice(-4)}`;

  // Not yet connected check (Task P4-T2: 30 days after creation without first use)
  let notYetConnectedWarning = false;
  if (!device.first_used_at) {
    const createdTime = new Date(device.created_at).getTime();
    const diffDays = (now.getTime() - createdTime) / (1000 * 60 * 60 * 24);
    if (diffDays >= 30) {
      notYetConnectedWarning = true;
    }
  }

  return {
    ...device,
    imei,
    iccid,
    isMasked: !isSuperAdmin,
    notYetConnectedWarning,
  };
}

/**
 * Generates a 256-bit random device authentication token encoded base64url (43 chars)
 * Per HW-SPEC 13.2 & Task P4-T2
 */
export function generateDeviceToken(): { plaintextToken: string; hmacSha256: string } {
  const entropy = crypto.randomBytes(32);
  const plaintextToken = entropy.toString('base64url'); // 43 characters
  return {
    plaintextToken,
    hmacSha256: crypto.createHash('sha256').update(plaintextToken).digest('hex'),
  };
}
