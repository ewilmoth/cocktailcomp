async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  me: () => request('/auth/me'),
  requestLink: (email) => request('/auth/request-link', { method: 'POST', body: JSON.stringify({ email }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  state: () => request('/competition/state'),
  results: () => request('/competition/results'),

  scoreDraft: (payload) => request('/scores/draft', { method: 'PATCH', body: JSON.stringify(payload) }),
  scoreSubmit: (payload) => request('/scores/submit', { method: 'POST', body: JSON.stringify(payload) }),
  myScores: () => request('/scores/mine'),

  adminCompetition: () => request('/admin/competition'),
  adminUsers: () => request('/admin/users'),
  adminCreateUser: (payload) => request('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  adminRemoveUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminReset: () => request('/admin/reset', { method: 'POST' }),
  adminSetOrder: (order) => request('/admin/running-order', { method: 'PUT', body: JSON.stringify({ order }) }),
  adminRandomizeOrder: () => request('/admin/randomize-order', { method: 'POST' }),
  adminStart: () => request('/admin/start', { method: 'POST' }),
  adminStartScoring: () => request('/admin/start-scoring', { method: 'POST' }),
  adminForceAdvance: () => request('/admin/force-advance', { method: 'POST' }),
  adminLeaderboard: () => request('/admin/leaderboard'),
  adminPublish: () => request('/admin/publish', { method: 'POST' }),
};
