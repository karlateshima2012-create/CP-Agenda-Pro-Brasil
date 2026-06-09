const axios = require('axios');
const client = axios.create({ baseURL: 'http://localhost:3000' });
client.interceptors.request.use(config => {
  config.headers.Authorization = 'Bearer TEST_TOKEN';
  return config;
});
console.log(client.interceptors);
