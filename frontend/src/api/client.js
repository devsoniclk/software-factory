import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API Error]', err.response?.status, err.message);
    return Promise.reject(err);
  }
);

// Bootstrap API key on startup — exempt endpoint, no auth needed
async function bootstrapApiKey() {
  try {
    const res = await axios.get('/api/health/api-key');
    if (res.data?.api_key) {
      client.defaults.headers.common['X-API-Key'] = res.data.api_key;
    }
  } catch (e) {
    console.error('Failed to retrieve API key:', e);
  }
}
bootstrapApiKey();

export default client;
