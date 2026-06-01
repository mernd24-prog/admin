const configuredBaseURL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  'http://localhost:4000';

const normalizedBaseURL = configuredBaseURL.replace(/\/+$/, '');
const baseURL = normalizedBaseURL.endsWith('/api/v1')
  ? `${normalizedBaseURL}/`
  : `${normalizedBaseURL}/api/v1/`;

export default baseURL;
