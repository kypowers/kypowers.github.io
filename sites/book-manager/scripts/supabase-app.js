// scripts/book-manager/supabase-app.js
// Minimal Supabase-powered loader for the admin page.
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project's values.

import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = '<REPLACE_WITH_YOUR_SUPABASE_URL>'; // e.g. 'https://xyzabc.supabase.co' jdbc:postgresql://aws-1-us-east-1.pooler.supabase.com:5432/postgres
const SUPABASE_ANON_KEY = '<REPLACE_WITH_YOUR_ANON_KEY>';

if (SUPABASE_URL.includes('<REPLACE') || SUPABASE_ANON_KEY.includes('<REPLACE')) {
    console.warn('Supabase credentials are not set in scripts/book-manager/supabase-app.js');
}

const supabase = (SUPABASE_URL.includes('<REPLACE') || SUPABASE_ANON_KEY.includes('<REPLACE'))
    ? null
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadBooks() {
    const el = document.getElementById('book-list');
    if (!el) return;
    el.textContent = 'Loading...';

    if (!supabase) {
        el.textContent = 'Supabase not configured. Please add your SUPABASE_URL and SUPABASE_ANON_KEY in scripts/book-manager/supabase-app.js';
        return;
    }

    try {
        const {data, error} = await supabase.from('books').select('*');
        if (error) throw error;
        if (!data || data.length === 0) {
            el.textContent = 'No books found.';
            return;
        }

        el.innerHTML = data.map(b => `
	  <div class="book"><strong>${escapeHtml(b.title || '')}</strong>${b.author ? ' — ' + escapeHtml(b.author) : ''}</div>
	`).join('\n');
    } catch (err) {
        el.textContent = 'Failed to load books: ' + (err.message || err);
        console.error(err);
    }
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

document.addEventListener('DOMContentLoaded', loadBooks);

