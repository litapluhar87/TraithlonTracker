const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const headers = () => ({
  'Content-Type': 'application/json',
  'x-user-id': localStorage.getItem('tt_user_id') || '',
});

const req = async (method, path, body) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${method} ${path} failed: ${res.status}`);
  return res.json();
};

export const api = {
  // Activities
  getActivities: (userId) => req('GET', `/api/activities/${userId}`),
  logActivity: (data) => req('POST', '/api/activities', data),
  deleteActivity: (id) => req('DELETE', `/api/activities/${id}`),

  // Training plan
  getTrainingPlan: () => req('GET', '/api/training-plan'),
  getWeeklySummary: (userId) => req('GET', `/api/weekly-summary/${userId}`),

  // Athlete
  getAthlete: (userId) => req('GET', `/api/athlete/${userId}`),
  createAthlete: (data) => req('POST', '/api/athlete', data),
  updateAthlete: (userId, data) => req('PUT', `/api/athlete/${userId}`, data),

  // Race config
  getRaceConfig: (userId) => req('GET', `/api/race-config/${userId}`),
};
