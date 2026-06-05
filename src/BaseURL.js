const configuredBaseURL = process.env.REACT_APP_API_BASE_URL ||
  process.env.VITE_API_BASE_URL  

const normalizedBaseURL = configuredBaseURL.replace(/\/+$/, '');
const baseURL = normalizedBaseURL.endsWith('/api/v1')
  ? `${normalizedBaseURL}/`
  : `${normalizedBaseURL}/api/v1/`;

export default baseURL;
