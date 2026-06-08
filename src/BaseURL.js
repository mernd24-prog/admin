const configuredBaseURL =
  
  'http://45.195.90.183:4000' ||
  'http://localhost:4000';

const normalizedBaseURL = configuredBaseURL.replace(/\/+$/, '');
const baseURL = normalizedBaseURL.endsWith('/api/v1')
  ? `${normalizedBaseURL}/`
  : `${normalizedBaseURL}/api/v1/`;

export default baseURL;
