// Configuración. Los valores reales van en el archivo .env (ver .env.example).
// Sin ellos la app arranca en MODO DEMO, con datos de ejemplo guardados en el navegador.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
export const SUPPORT_WHATSAPP = import.meta.env.VITE_SOPORTE_WHATSAPP || '';
export const DEMO = import.meta.env.MODE === 'demo' || !SUPABASE_URL || !SUPABASE_ANON_KEY;
export const APP_NAME = 'HatilloMall';
export const TOWN = 'Hatillo de Loba';
// Los cajeros entran con un usuario (ej. "rancho-cajero"); por dentro es este correo
export const USER_DOMAIN = 'usuarios.hatillomall.co';
export const IMPULSO_PRECIO = 15000;
export const PLAN_PLUS_PRECIO = 70000;
