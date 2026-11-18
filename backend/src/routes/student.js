import { getStudentOverview } from '../services/student.js';

export function registerStudentRoutes({ router, db }) {
  // Served from our synced copy of Fedena: fast, and works even if Fedena is down.
  router.get('/api/student/overview', ({ user }) => ({ success: true, ...getStudentOverview(db, user) }), { roles: ['student'] });
}
