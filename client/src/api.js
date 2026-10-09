export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

const post = (path, body) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const comp = (id) => `/admin/competitions/${id}`;

export const api = {
  me: () => request('/auth/me'),
  login: (email, password) => post('/auth/login', { email, password }),
  logout: () => post('/auth/logout'),

  openCompetitions: () => request('/me/open-competitions'),
  join: (payload) => post('/me/join', payload),

  state: () => request('/competition/state'),
  results: () => request('/competition/results'),
  observerFeed: () => request('/competition/feed'),

  scoreDraft: (payload) => request('/scores/draft', { method: 'PATCH', body: JSON.stringify(payload) }),
  scoreSubmit: (payload) => post('/scores/submit', payload),
  myScores: () => request('/scores/mine'),

  adminCompetitions: () => request('/admin/competitions'),
  adminCreateCompetition: (name) => post('/admin/competitions', { name }),
  adminCompetition: (id) => request(comp(id)),
  adminSetOrder: (id, order) => request(`${comp(id)}/running-order`, { method: 'PUT', body: JSON.stringify({ order }) }),
  adminRandomizeOrder: (id) => post(`${comp(id)}/randomize-order`),
  adminStart: (id) => post(`${comp(id)}/start`),
  adminStartScoring: (id) => post(`${comp(id)}/start-scoring`),
  adminForceAdvance: (id, expectedIndex) => post(`${comp(id)}/force-advance`, { expectedIndex }),
  adminLeaderboard: (id, scoresPassword) =>
    request(`${comp(id)}/leaderboard`, {
      headers: { 'Content-Type': 'application/json', ...(scoresPassword ? { 'X-Scores-Password': scoresPassword } : {}) },
    }),
  adminPublish: (id) => post(`${comp(id)}/publish`),
  adminReset: (id) => post(`${comp(id)}/reset`),
  adminDeleteCompetition: (id) => request(comp(id), { method: 'DELETE' }),
  adminRemoveMember: (id, userId) => request(`${comp(id)}/members/${userId}`, { method: 'DELETE' }),
  adminMakeObserver: (id, userId) => post(`${comp(id)}/observers/${userId}`),
  adminRemoveObserver: (id, userId) => request(`${comp(id)}/observers/${userId}`, { method: 'DELETE' }),
};
