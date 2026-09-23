export async function encrypt(text: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' }, false, ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)
  );
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));
}

export async function decrypt(encoded: string, secret: string): Promise<string> {
  const data = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' }, false, ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: data.slice(0, 12) }, key, data.slice(12)
  );
  return new TextDecoder().decode(decrypted);
    }
