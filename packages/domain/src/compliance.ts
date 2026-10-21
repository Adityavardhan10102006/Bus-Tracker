export type ComplianceStatus = 'VALID' | 'WARN_30_DAYS' | 'WARN_7_DAYS' | 'EXPIRED';

export interface DocumentComplianceCheck {
  docType: 'INSURANCE' | 'FITNESS' | 'POLLUTION' | 'PERMIT';
  expiryDate: string;
  daysRemaining: number;
  status: ComplianceStatus;
  badgeLabel: string;
  badgeColorHex: string;
}

export interface BusComplianceSummary {
  busId: string;
  busNumber: string;
  isCompliant: boolean;
  hasExpiredDocuments: boolean;
  hasUpcomingWarnings: boolean;
  checks: DocumentComplianceCheck[];
}

/**
 * Evaluates document compliance expiry per Specification 22 & Task P4-T1
 * Thresholds: Warn at 30 days and 7 days (doc.expiry_warn_days)
 */
export function evaluateDocumentCompliance(
  expiryDateStr: string,
  docType: DocumentComplianceCheck['docType'],
  now = new Date(),
): DocumentComplianceCheck {
  const expiry = new Date(expiryDateStr);
  const diffTime = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      docType,
      expiryDate: expiryDateStr,
      daysRemaining,
      status: 'EXPIRED',
      badgeLabel: `Expired ${Math.abs(daysRemaining)}d ago`,
      badgeColorHex: '#DC2626', // Red-600
    };
  }

  if (daysRemaining <= 7) {
    return {
      docType,
      expiryDate: expiryDateStr,
      daysRemaining,
      status: 'WARN_7_DAYS',
      badgeLabel: `Expires in ${daysRemaining}d`,
      badgeColorHex: '#EA580C', // Orange-600
    };
  }

  if (daysRemaining <= 30) {
    return {
      docType,
      expiryDate: expiryDateStr,
      daysRemaining,
      status: 'WARN_30_DAYS',
      badgeLabel: `Expires in ${daysRemaining}d`,
      badgeColorHex: '#D97706', // Amber-600
    };
  }

  return {
    docType,
    expiryDate: expiryDateStr,
    daysRemaining,
    status: 'VALID',
    badgeLabel: 'Compliant',
    badgeColorHex: '#16A34A', // Green-600
  };
}

export function evaluateBusCompliance(
  bus: {
    id: string;
    bus_number: string;
    insurance_expiry: string;
    fitness_expiry: string;
    pollution_expiry: string;
    permit_expiry: string;
  },
  now = new Date(),
): BusComplianceSummary {
  const checks: DocumentComplianceCheck[] = [
    evaluateDocumentCompliance(bus.insurance_expiry, 'INSURANCE', now),
    evaluateDocumentCompliance(bus.fitness_expiry, 'FITNESS', now),
    evaluateDocumentCompliance(bus.pollution_expiry, 'POLLUTION', now),
    evaluateDocumentCompliance(bus.permit_expiry, 'PERMIT', now),
  ];

  const hasExpired = checks.some(c => c.status === 'EXPIRED');
  const hasWarnings = checks.some(c => c.status === 'WARN_7_DAYS' || c.status === 'WARN_30_DAYS');

  return {
    busId: bus.id,
    busNumber: bus.bus_number,
    isCompliant: !hasExpired,
    hasExpiredDocuments: hasExpired,
    hasUpcomingWarnings: hasWarnings,
    checks,
  };
}
