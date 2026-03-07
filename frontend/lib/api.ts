/**
 * API Client – Axios-Instanz mit Auto-Refresh
 * Alle API-Aufrufe laufen über diesen Client
 */
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true, // Cookies mitsenden (für httpOnly Refresh-Token)
    headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Access-Token anhängen ───────────────────────────────
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// ─── Response Interceptor: Auto-Refresh bei 401 ───────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isAuthRequest = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
            if (isRefreshing) {
                // Andere Requests in die Warteschlange
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
                    withCredentials: true,
                });
                const newToken = data.accessToken;
                sessionStorage.setItem('accessToken', newToken);

                // Warteschlange abarbeiten
                failedQueue.forEach(({ resolve }) => resolve(newToken));
                failedQueue = [];

                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                failedQueue.forEach(({ reject }) => reject(refreshError));
                failedQueue = [];
                sessionStorage.removeItem('accessToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
