import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000/api' });

api.interceptors.request.use(config => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(r => r, async error => {
    const original = error.config;
    if (error.response?.status === 403 && !original._retry) {
        original._retry = true;
        const rt = localStorage.getItem('refreshToken');
        try {
            const { data } = await axios.post('http://localhost:3000/api/auth/refresh', {}, {
                headers: { Authorization: `Bearer ${rt}` }
            });
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            return api(original);
        } catch (e) {
            localStorage.clear();
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});

export default api;