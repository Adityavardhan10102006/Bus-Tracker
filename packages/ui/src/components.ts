import { VJIT_COLORS, VJIT_RADII, VJIT_SPACING } from './tokens.js';
import type { TrackingIntegrityState } from '@vjit/domain';

export interface StateBadgeDescriptor {
  state: TrackingIntegrityState;
  label: string;
  icon: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  accessibilityLabel: string;
}

/**
 * Returns accessible badge descriptor for tracking integrity states
 * Conforms to UI-SPEC-1.0 Section 5 and Rule R-20 (Colour is never the only indicator)
 */
export function getStateBadgeDescriptor(state: TrackingIntegrityState, ageSeconds?: number): StateBadgeDescriptor {
  switch (state) {
    case 'LIVE_HW':
      return {
        state,
        label: 'Live • Bus Tracker',
        icon: 'radio',
        backgroundColor: VJIT_COLORS.stateLiveLight,
        textColor: VJIT_COLORS.stateLive,
        borderColor: '#86EFAC',
        accessibilityLabel: 'Status: Live tracking from verified bus hardware',
      };
    case 'LIVE_PHONE':
      return {
        state,
        label: "Live • Driver's Phone",
        icon: 'smartphone',
        backgroundColor: VJIT_COLORS.stateLiveLight,
        textColor: VJIT_COLORS.stateLive,
        borderColor: '#86EFAC',
        accessibilityLabel: "Status: Live tracking from driver's mobile device",
      };
    case 'STALE':
      return {
        state,
        label: ageSeconds ? `Updated ${ageSeconds}s ago` : 'Stale signal',
        icon: 'clock',
        backgroundColor: VJIT_COLORS.stateStaleLight,
        textColor: VJIT_COLORS.stateStale,
        borderColor: '#CBD5E1',
        accessibilityLabel: `Status: Signal stale. ${ageSeconds ? `Last seen ${ageSeconds} seconds ago` : ''}`,
      };
    case 'UNAVAILABLE':
      return {
        state,
        label: 'Location unavailable',
        icon: 'alert-triangle',
        backgroundColor: VJIT_COLORS.stateUnavailLight,
        textColor: VJIT_COLORS.stateUnavail,
        borderColor: '#FCA5A5',
        accessibilityLabel: 'Status: Location unavailable. Check schedule or contact transport desk.',
      };
    case 'NOT_RUNNING':
    default:
      return {
        state: 'NOT_RUNNING',
        label: 'Not running',
        icon: 'power',
        backgroundColor: VJIT_COLORS.stateIdleLight,
        textColor: VJIT_COLORS.stateIdle,
        borderColor: '#FDE68A',
        accessibilityLabel: 'Status: Bus is currently not on active shift or trip.',
      };
  }
}

/**
 * Standard Button Styling Variants conforming to VJIT brand
 */
export const BUTTON_STYLES = {
  primary: {
    backgroundColor: VJIT_COLORS.brandRed,
    color: VJIT_COLORS.canvasWhite,
    borderRadius: VJIT_RADII.md,
    padding: `${VJIT_SPACING.sm} ${VJIT_SPACING.lg}`,
    fontWeight: '600',
    border: 'none',
  },
  secondary: {
    backgroundColor: VJIT_COLORS.brandNavy,
    color: VJIT_COLORS.canvasWhite,
    borderRadius: VJIT_RADII.md,
    padding: `${VJIT_SPACING.sm} ${VJIT_SPACING.lg}`,
    fontWeight: '600',
    border: 'none',
  },
  outline: {
    backgroundColor: 'transparent',
    color: VJIT_COLORS.brandNavy,
    borderRadius: VJIT_RADII.md,
    padding: `${VJIT_SPACING.sm} ${VJIT_SPACING.lg}`,
    fontWeight: '600',
    border: `1px solid ${VJIT_COLORS.brandNavy}`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: VJIT_COLORS.textSecondary,
    borderRadius: VJIT_RADII.md,
    padding: `${VJIT_SPACING.sm} ${VJIT_SPACING.lg}`,
    fontWeight: '500',
    border: 'none',
  },
} as const;

/**
 * Standard Loading and Empty State Descriptors
 */
export interface FeedbackStateDescriptor {
  type: 'LOADING' | 'EMPTY' | 'ERROR';
  title: string;
  message: string;
  actionLabel?: string;
}

export function getEmptyStateDescriptor(entityName: string): FeedbackStateDescriptor {
  return {
    type: 'EMPTY',
    title: `No ${entityName} available`,
    message: `There are currently no ${entityName.toLowerCase()} registered in the system. Authorized staff can configure them from the management console.`,
  };
}
