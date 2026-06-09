// ==========================================
// 1. DYNAMIC LIBRARY LOADER (Bypasses CORS/Modules)
// ==========================================
function loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
        // If it's already loaded somehow, don't repeat
        if (window.supabase) return resolve(window.supabase);

        const script = document.createElement('script');
        // Using a highly resilient global JS mirror
        script.src = 'https://cloudflare.com';
        script.onload = () => resolve(window.supabase);
        script.onerror = () => reject(new Error('Failed to download Supabase library.'));
        document.head.appendChild(script);
    });
}

// ==========================================
// 2. SAFE CONFIGURATION & INITIALIZATION
// ==========================================
const SUPABASE_URL = 'https://zloscdxigeruokwuppor.supabase.co';
const SUPABASE_ANON_KEY = '';

let supabaseClient = null;

// ==========================================
// 3. SECURE APP BOOTSTRAPPER
// ==========================================
async function startApplication() {
    const listDiv = document.getElementById('books-list');

    try {
        // Force the browser to successfully map the library first
        const supabaseLib = await loadSupabaseLibrary();

        // Initialize the client using a unique local variable name
        supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase Client initialized successfully!");

        // Run your application routing
        handleRouting();

    } catch (err) {
        console.error(err);
        if (listDiv) {
            listDiv.innerHTML = `❌ System Boot Failure: ${err.message}. Please refresh the page.`;
        }
    }
}

// Replace your old DOMContentLoaded listener at the bottom of app.js with this one:
document.addEventListener('DOMContentLoaded', startApplication);


// import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
// import {createClient} from 'https://unpkg.com';

// const SUPABASE_URL = 'https://zloscdxigeruokwuppor.supabase.co';
// const SUPABASE_ANON_KEY = '';
//
//
// const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- UI DOM ELEMENTS ---
const publicView = document.getElementById('public-view');
const adminView = document.getElementById('admin-view');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const addBookForm = document.getElementById('add-book-form');
const logoutBtn = document.getElementById('logout-btn');

// --- HASH ROUTING CONTROLLER ---
function handleRouting() {
    const hash = window.location.hash;

    if (hash === '#admin') {
        publicView.classList.add('hidden');
        adminView.classList.remove('hidden');
        checkUserSession(); // Determine if we show login form or add book dashboard
    } else {
        adminView.classList.add('hidden');
        publicView.classList.remove('hidden');
        fetchPublicBooks(); // Refresh list when returning to view screen
    }
}

// Listen for back/forward browser movement or link clicks
window.addEventListener('hashchange', handleRouting);
document.addEventListener('DOMContentLoaded', handleRouting);

// --- AUTHENTICATION MONITOR ---
async function checkUserSession() {
    // Fetches token automatically saved in localStorage by the Supabase SDK
    const {data: {session}} = await supabaseClient.auth.getSession();

    if (session) {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
    } else {
        dashboardSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    }
}

// Handle login submissions
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const {error} = await supabaseClient.auth.signInWithPassword({email, password});

    if (error) {
        alert(`Login failed: ${error.message}`);
    } else {
        loginForm.reset();
        checkUserSession();
    }
});

// Handle logout actions
logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.hash = ''; // Boot user back to public library page
});

// --- DATA READ OPERATION ---
// Replace the fetchPublicBooks function in app.js with this safer version:
async function fetchPublicBooks() {
    const listDiv = document.getElementById('books-list');
    listDiv.innerHTML = "Loading books...";

    try {
        const {data, error} = await supabaseClient
            .from('book')
            .select(`id, title, description`);

        if (error) {
            listDiv.innerHTML = `⚠️ Database Error: ${error.message}`;
            return;
        }

        if (!data || data.length === 0) {
            listDiv.innerHTML = "📚 Your library is currently empty. Go to the Admin Portal to add your first book!";
            return;
        }

        listDiv.innerHTML = data.map(book => `
            <div class="book-card">
                <h3>${book.title}</h3>
                <p>${book.description || 'No description provided.'}</p>
            </div>
        `).join('');
    } catch (err) {
        listDiv.innerHTML = `❌ Connection Failed: ${err.message}`;
    }
}

// --- DATA WRITE OPERATION ---
addBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Map input fields and sanitize array listings
    const payload = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        authors: document.getElementById('authors').value.split(',').map(s => s.trim()),
        tropes: document.getElementById('tropes').value.split(',').map(s => s.trim()).filter(s => s.length > 0)
    };

    // Execute the secure PostgreSQL database function we saved in the last turn
    const {data, error} = await supabaseClient.rpc('insert_complete_book', {book_payload: payload});

    if (error) {
        alert(`Error saving book: ${error.message}`);
    } else {
        alert("Book successfully added!");
        addBookForm.reset();
        window.location.hash = ''; // Return to the public view to see the addition
    }
});
