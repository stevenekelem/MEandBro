/**
 * API Utility to resolve the correct backend URL depending on the running environment.
 * 
 * - In standard web development (Vite dev server), relative paths /api/* are proxied.
 * - On the Android Emulator (Capacitor), localhost on the host machine is accessed via 10.0.2.2.
 * - On the iOS Simulator (Capacitor), localhost on the host machine is accessed via localhost.
 */
export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;

  // Check if Capacitor is available globally
  const capacitor = (window as any).Capacitor;
  
  if (capacitor) {
    const platform = capacitor.getPlatform?.();
    if (platform === 'android' || platform === 'ios') {
      return `http://192.168.1.65:3001/${cleanPath}`;
    }
  }

  // Fallback to relative path for web browser development and standard deployments
  return `/${cleanPath}`;
};
