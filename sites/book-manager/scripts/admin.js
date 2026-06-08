import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Debug: confirm the module loaded
console.log('admin.js module loaded');

// Provide a tiny `$` helper (if one isn't already present) that maps an id to
// `document.getElementById`. This keeps the rest of the script working if a
// larger helper library isn't loaded on the page.
if (typeof window.$ !== 'function') {
    window.$ = id => document.getElementById(id);
}

// Keep a reference to the supabase client once created
let supabase = null;

// Minimal stubs for helper functions that may be defined elsewhere in the
// original project. These are safe no-ops for local testing; real
// implementations can replace them.
if (typeof window.showMessage !== 'function') {
    window.showMessage = msg => {
        console.log('showMessage:', msg);
        const status = $('connectionStatus');
        if (status) status.textContent = msg;
    };
}

if (typeof window.loadLookups !== 'function') {
    window.loadLookups = async () => {
        console.log('loadLookups: stub');
        return Promise.resolve();
    };
}

if (typeof window.loadBooks !== 'function') {
    window.loadBooks = async () => {
        console.log('loadBooks: stub');
        return Promise.resolve();
    };
}


const connectBtn = document.getElementById('connectBtn');

// Defensive: if the element isn't found, log a warning instead of throwing.
if (connectBtn) {
    connectBtn.addEventListener('click', supabaseWriteLogin);
} else {
    console.warn('connectBtn not found in DOM at module evaluation time; will try again after DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('connectBtn');
        if (btn) {
            btn.addEventListener('click', supabaseWriteLogin);
            console.log('connectBtn listener attached on DOMContentLoaded');
        } else {
            console.error('connectBtn still not found after DOMContentLoaded');
        }
    });
}

function setConnected(connected) {
    const statusEl = $('connectionStatus');
    if (statusEl) statusEl.textContent = connected ? 'Connected' : 'Not connected';
    const bookPanel = $('bookPanel');
    if (bookPanel) bookPanel.style.display = connected ? 'block' : 'none';
}

function setUserDisplay(user) {
    const el = $('currentUser');
    if (!el) return;
    if (user) {
        el.textContent = `${user.email} (${user.id})`;
    } else {
        el.textContent = 'Not signed in';
    }
}

async function supabaseWriteLogin() {
    console.log('supabaseWriteLogin called');
    // Hardcoded Supabase URL and Key
    const url = 'https://zloscdxigeruokwuppor.supabase.co/rest/v1/';
    const key = $('supabaseKey').value.trim();

    if (!key) {
        showMessage('Missing key');
        return;
    }

    supabase = createClient(url, key);
    console.log('Supabase client created');

    setConnected(true);
    showMessage('Connected — loading data...');

    // show current session user (if any) and subscribe to auth changes
    try {
        const {data: {session}} = await supabase.auth.getSession();
        setUserDisplay(session?.user ?? null);
    } catch (e) {
        console.warn('getSession failed', e);
    }

    supabase.auth.onAuthStateChange((event, session) => {
        setUserDisplay(session?.user ?? null);
    });

    await loadLookups();
    await loadBooks();
}
