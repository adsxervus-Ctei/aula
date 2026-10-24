/* =========================================================================
   Aprende JAC · Chimí — Configuración
   -------------------------------------------------------------------------
   POR DEFECTO LA APP NO ENVÍA NADA A INTERNET. Todo queda en el teléfono.

   Solo si el equipo investigador decide sincronizar los resultados de la
   evaluación (códigos seudónimos, nunca nombres ni cédulas), llene estos dos
   valores con los de su proyecto de Supabase. Vea docs/GUIA_DESPLIEGUE.md.
   La clave "publishable" es pública por diseño; la seguridad la dan las políticas RLS
   del archivo supabase/esquema.sql, que solo permiten INSERTAR, nunca leer.
   ========================================================================= */
window.CONFIG = {
  supabaseUrl: "",      // ej.: "https://abcdefghij.supabase.co"
  supabaseAnonKey: "",  // ej.: "sb_publishable_..."  (clave publishable; la antigua "anon" eyJ... también sirve)
  junta: "JAC Central de Chimí"
};
