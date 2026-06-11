import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';


const SUPABASE_URL = 'https://zloscdxigeruokwuppor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XsU1ogWFtYNKajfz7Oo69Q_dKYRYJfo';

export const supabase = (SUPABASE_URL.includes('<REPLACE') || SUPABASE_ANON_KEY.includes('<REPLACE'))
    ? null
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);