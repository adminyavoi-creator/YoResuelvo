import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { db } from './api';

export type AuthIntent = 'cliente' | 'prestador';
const INTENT_KEY = 'yoresuelvo:auth-intent:v1';
export const NATIVE_AUTH_REDIRECT = 'mx.yoresuelvo.app://auth/callback';
export const isNativeApp = () => Capacitor.isNativePlatform();

export function savedAuthIntent(): AuthIntent {
  try { return localStorage.getItem(INTENT_KEY) === 'prestador' ? 'prestador' : 'cliente'; }
  catch { return 'cliente'; }
}

export function saveAuthIntent(intent: AuthIntent) {
  try { localStorage.setItem(INTENT_KEY, intent); } catch { /* Private browsing may disable local storage. */ }
}

function publishAuthError(message: string) {
  window.dispatchEvent(new CustomEvent('yoresuelvo-auth-error', { detail: message }));
}

async function completeNativeRedirect(url: string) {
  if (!url.startsWith(NATIVE_AUTH_REDIRECT) || !db) return;
  try { await Browser.close(); } catch { /* The app may have been opened from a cold start. */ }
  const callback = new URL(url);
  const description = callback.searchParams.get('error_description');
  if (description) {
    publishAuthError(description.replaceAll('+', ' '));
    return;
  }
  const { error } = await db.auth.exchangeCodeForSession(url);
  if (error) publishAuthError(error.message);
}

export async function initializeNativeAuth() {
  if (!isNativeApp()) return;
  await App.addListener('appUrlOpen', ({ url }) => { void completeNativeRedirect(url); });
  const launch = await App.getLaunchUrl();
  if (launch?.url) await completeNativeRedirect(launch.url);
}

export async function signInWithGoogle(intent: AuthIntent) {
  if (!db) throw new Error('Falta configurar el proyecto independiente de YoResuelvo!.');
  saveAuthIntent(intent);
  const native = isNativeApp();
  const redirectTo = native ? NATIVE_AUTH_REDIRECT : `${window.location.origin}/auth/callback`;
  const { data, error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: native,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  if (native) {
    if (!data.url) throw new Error('Google no devolvió una dirección de acceso.');
    await Browser.open({ url: data.url, presentationStyle: 'popover' });
  }
}
