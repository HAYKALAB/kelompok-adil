export interface HealthResponse {
  status: string;
  db: 'connected' | 'error' | string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');
  const data = await response.json();

  if (!response.ok && response.status !== 503) {
    throw new Error(data?.error?.message || 'Gagal menghubungi server');
  }

  return data as HealthResponse;
}
