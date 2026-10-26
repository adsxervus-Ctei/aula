// Configuración. Los valores reales van en el archivo .env (ver .env.example).
// Si faltan, la app arranca en MODO DEMO con datos de ejemplo guardados en el navegador.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
export const DEMO = import.meta.env.MODE === 'demo' || !SUPABASE_URL || !SUPABASE_ANON_KEY;
export const APP_NAME = 'Loba Conecta';
export const TOWN = 'Hatillo de Loba';
