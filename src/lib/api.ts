// Pequeno wrapper de API baseado em fetch, estilo axios-like suficiente para uso interno

type RequestOptions = {
	params?: Record<string, string | number | boolean | undefined>;
	headers?: Record<string, string>;
	body?: any;
};

const base = (() => {
	const env = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
	// Se definido, usar como base; caso contrário, assumir mesmo host (útil para Electron) ou localhost dev
	if (env) return env.replace(/\/$/, '');
	// fallback para desenvolvimento local
	return 'http://localhost:3001';
})();

function buildUrl(path: string, params?: RequestOptions['params']) {
	const url = new URL(path.startsWith('http') ? path : `${base}${path}`);
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
		}
	}
	return url.toString();
}

async function request<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, opts: RequestOptions = {}) {
	const url = buildUrl(path, opts.params);
	const init: RequestInit = {
		method,
		headers: {
			'Content-Type': 'application/json',
			...(opts.headers || {}),
		},
	};
	if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

	const res = await fetch(url, init);
	const data = await (async () => {
		const ct = res.headers.get('content-type') || '';
		if (ct.includes('application/json')) return res.json();
		return res.text();
	})();

	return { status: res.status, data: data as T };
}

export const api = {
	get: <T = any>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
	post: <T = any>(path: string, body?: any, opts?: Omit<RequestOptions, 'body'>) => request<T>('POST', path, { ...(opts || {}), body }),
	put: <T = any>(path: string, body?: any, opts?: Omit<RequestOptions, 'body'>) => request<T>('PUT', path, { ...(opts || {}), body }),
	delete: <T = any>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
};

export default api;

