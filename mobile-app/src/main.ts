import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { api } from './api/client';
import { store } from './store';
import { navigate, setLoading, setNavVisible } from './app';

async function bootstrap() {
  // Configure native UI
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#1B3A6B' });
    } catch { /* ignore on platforms that don't support this */ }
  }

  // Load cached state
  await store.load();

  // Handle auth:logout event (e.g., token expired during use)
  window.addEventListener('auth:logout', () => {
    setNavVisible(false);
    navigate('login');
    import('./app').then(m => m);
  });

  // Check for existing session
  const token = await api.getToken();

  if (token) {
    setLoading(true);
    try {
      const me = await api.getMe();
      await store.setUser(me.user);
      await store.setAccounts(me.accounts);
      await navigate('dashboard');
    } catch {
      // Token invalid — clear and go to login
      await store.clear();
      await navigate('login');
    } finally {
      setLoading(false);
    }
  } else {
    await navigate('login');
  }

  // Hide native splash screen
  if (Capacitor.isNativePlatform()) {
    try {
      await SplashScreen.hide({ fadeOutDuration: 400 });
    } catch { /* ignore */ }
  }
}

// Start the app
bootstrap().catch(console.error);
