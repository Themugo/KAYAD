// ROOT CAUSE of the "cannot change the platform logo" failure: the shared client defaults Content-Type to application/json, and
// axios 1.x serialises a FormData body to JSON in that case (a File becomes {}), so the server never received the image
// (reproduced on the wire: server saw `{"logo":{}}`). This drives the REAL client (interceptors + axios request transform) and
// inspects what is handed to the transport: the body must still be the FormData, with a multipart Content-Type.
import { describe, test, expect } from 'vitest';
import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const capture = async (data: unknown) => {
  const { api } = await import('../../api/httpClient');
  const { setCSRFToken } = await import('../../utils/csrf');
  setCSRFToken('a'.repeat(40));
  let seen: InternalAxiosRequestConfig | null = null;
  const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    seen = config;
    return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
  };
  await api.post('/admin/upload-logo', data, { adapter } as AxiosRequestConfig);
  return seen as unknown as InternalAxiosRequestConfig;
};

describe('FormData uploads through the shared API client', () => {
  test('a file stays a multipart FormData body; it is not turned into the JSON text {"logo":{}}', async () => {
    const form = new FormData();
    form.append('logo', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }), 'logo.png');
    const sent = await capture(form);
    expect(typeof sent.data).not.toBe('string');
    expect(sent.data).toBeInstanceOf(FormData);
    expect(String(sent.headers.get('Content-Type'))).toMatch(/multipart\/form-data/);
    expect((sent.data as FormData).get('logo')).toBeInstanceOf(Blob);
    expect(sent.headers.get('X-CSRF-Token')).toBeTruthy();
  });
  test('ordinary JSON requests are unchanged', async () => {
    const sent = await capture({ a: 1 });
    expect(sent.data).toBe('{"a":1}');
    expect(String(sent.headers.get('Content-Type'))).toMatch(/application\/json/);
  });
});
