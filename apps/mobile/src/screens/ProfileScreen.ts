import type { UserProfile, AttendanceRecord, LeaveRecord } from '@vjit/contracts';

export interface ProfileScreenState {
  profile: UserProfile | null;
  attendanceHistory: AttendanceRecord[];
  leaveRecords: LeaveRecord[];
  isEditingPhone: boolean;
  phoneInput: string;
  isSubmittingLeave: boolean;
  isExportingData: boolean;
  activeSubSection: 'OVERVIEW' | 'ATTENDANCE' | 'LEAVE' | 'FACULTY_PORTAL' | 'PRIVACY';
  isLoading: boolean;
  statusMessage?: string | undefined;
  errorMessage?: string | undefined;
}

export interface ProfileScreenViewModel {
  profile: UserProfile | null;
  roleDisplayName: string;
  phoneDisplay: string;
  activeSubSection: ProfileScreenState['activeSubSection'];
  attendanceCount: number;
  leaveCount: number;
  isFaculty: boolean;
  privacyRights: {
    canExport: boolean;
    canDelete: boolean;
    canWithdrawConsent: boolean;
    privacyNotice: string;
  };
  emptyAttendanceNotice?: string | undefined;
}

/**
 * Pure controller and view model builder for Profile and Settings Screen
 * Implements Tasks P2-T5, P2-T6, P2-T7, P2-T9
 */
export function buildProfileScreenViewModel(state: ProfileScreenState): ProfileScreenViewModel {
  const profile = state.profile;
  const isFaculty = profile ? profile.role === 'FAC' : false;

  let roleDisplayName = 'College Student';
  if (profile?.role === 'FAC') roleDisplayName = 'College Faculty Member';

  return {
    profile,
    roleDisplayName,
    phoneDisplay: profile ? profile.phone : '—',
    activeSubSection: state.activeSubSection,
    attendanceCount: state.attendanceHistory.length,
    leaveCount: state.leaveRecords.length,
    isFaculty,
    privacyRights: {
      canExport: true,
      canDelete: true,
      canWithdrawConsent: true,
      privacyNotice: 'VJIT Bus Tracker complies with Indian DPDP privacy regulations. Your location is never tracked by this app (Rule R-19).',
    },
    emptyAttendanceNotice:
      state.attendanceHistory.length === 0
        ? 'No attendance records logged yet. Check in by tapping your RFID card or scanning the verified vehicle QR placard upon boarding.'
        : undefined,
  };
}
