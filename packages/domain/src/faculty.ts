export interface FacultyRosterPassenger {
  student_id: string;
  roll_number: string;
  name: string;
  stop_id: string;
  stop_name: string;
  status: 'EXPECTED' | 'BOARDED' | 'LATE_BOARDED' | 'ON_LEAVE' | 'ABSENT';
  boarded_at?: string;
}

export interface AbsenceAlert {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  service_date: string;
  trip_type: 'AFTERNOON';
  morning_status: 'BOARDED' | 'LATE_BOARDED';
  afternoon_status: 'ABSENT';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolution?: 'CONFIRMED_ABSENT' | 'BOARDED_LATE' | 'EXCUSED';
}

/**
 * Filter students on faculty's bus by query (name or roll number)
 */
export function filterFacultyRoster(
  roster: FacultyRosterPassenger[],
  query: string,
): FacultyRosterPassenger[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return roster;
  return roster.filter(
    p =>
      p.name.toLowerCase().includes(trimmed) ||
      p.roll_number.toLowerCase().includes(trimmed) ||
      p.stop_name.toLowerCase().includes(trimmed),
  );
}

/**
 * Summary counts for faculty bus trip
 */
export function computeFacultyRosterSummary(roster: FacultyRosterPassenger[]) {
  return {
    total: roster.length,
    boarded: roster.filter(p => p.status === 'BOARDED' || p.status === 'LATE_BOARDED').length,
    expected: roster.filter(p => p.status === 'EXPECTED').length,
    on_leave: roster.filter(p => p.status === 'ON_LEAVE').length,
    absent: roster.filter(p => p.status === 'ABSENT').length,
  };
}
