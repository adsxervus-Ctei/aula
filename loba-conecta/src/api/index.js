// Elige automáticamente: Supabase real o modo demo
import { DEMO } from '../config.js';
import { api as demoApi } from './demoApi.js';
import { api as realApi } from './supabaseApi.js';

export const api = DEMO ? demoApi : realApi;
