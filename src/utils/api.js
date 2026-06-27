const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const req = async (method, path, body) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
};

export const api = {
  // Activities (manual entry)
  getActivities:  (userId) => req('GET',    `/api/manual/activities/${userId}`),
  logActivity:    (data)   => req('POST',   `/api/activities`, data),
  deleteActivity: (id)     => req('DELETE', `/api/activities/${id}`),

  // Athlete (manual entry — get or auto-create)
  getOrCreateAthlete: (userId) => req('GET', `/api/manual/athlete/${userId}`),
};
