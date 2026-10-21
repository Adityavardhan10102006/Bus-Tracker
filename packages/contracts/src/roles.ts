import { z } from 'zod';

export const userRoleSchema = z.enum([
  'STU', // Student
  'FAC', // Faculty
  'COR', // Transport Coordinator
  'TEC', // Fleet Technician
  'SAD', // Super Admin
  'MGT', // College Management
  'SEC', // Security Staff (Read-Only)
]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const userRoles = userRoleSchema.options;
export const ALL_USER_ROLES = userRoles;

export const STAFF_ROLES: readonly UserRole[] = ['COR', 'TEC', 'SAD', 'MGT', 'SEC'] as const;

export function isStaffRole(role: UserRole): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function requiresMfa(role: UserRole): boolean {
  // All transport staff roles require MFA per Part F Control 4, Task P0-T12 & Spec 28
  return isStaffRole(role);
}
