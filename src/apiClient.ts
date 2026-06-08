import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE ?? '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    }
});

// Response interceptor to handle session expiration
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Unauthorized - session likely expired
            console.warn('Session expired or unauthorized');
            // Allow login page to handle the 401 error specifically
        }
        // Prefer the server's error message (e.g., "E-mail ou senha incorretos")
        const serverError = error.response?.data?.error || error.response?.data?.message;
        return Promise.reject(new Error(serverError || error.message));
    }
);

export default apiClient;
