import axios from 'axios';

const USER_TOKEN_KEY = 'csai_user_token';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター: auth_token or profile_id をBearerヘッダーに付与
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(USER_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// レスポンスインターセプター: 401でトークンクリア
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // admin sessionの401ではuser tokenをクリアしない
      const url = error.config?.url ?? '';
      if (!url.startsWith('/admin') && !url.startsWith('/api/admin')) {
        localStorage.removeItem(USER_TOKEN_KEY);
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return '予期しないエラーが発生しました';
}

export default apiClient;
