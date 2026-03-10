import { base44 } from '@/api/base44Client';

// SDK pass-through — mirrors Base44 compat layer behavior
export const User = new Proxy({}, {
  get: (_, prop) => {
    if (prop === 'me') return base44.auth.me;
    if (prop === 'loginWithRedirect' || prop === 'login') return base44.auth.loginWithRedirect;
    if (prop === 'logout') return base44.auth.logout;
    if (prop === 'updateMyUserData') return base44.auth.updateMe;
    return base44.entities.User?.[prop];
  }
});
