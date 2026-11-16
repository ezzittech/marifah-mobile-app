import { getAcademic } from '../services/academic.js';

export function registerAcademicRoutes({ router }) {
  router.get('/api/academic', () => ({ success: true, ...getAcademic() }), { roles: ['student', 'parent', 'admin'] });
}
