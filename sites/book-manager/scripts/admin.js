import {supabase} from './supabaseClient.js';

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


// --- UI DOM ELEMENTS ---
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const addBookForm = document.getElementById('add-book-form');
const logoutBtn = document.getElementById('logout-btn');


// --- AUTHENTICATION MONITOR ---
async function checkUserSession() {
    // Fetches token automatically saved in localStorage by the Supabase SDK
    const {data: {session}} = await supabase.auth.getSession();

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

    const {error} = await supabase.auth.signInWithPassword({email, password});

    if (error) {
        alert(`Login failed: ${error.message}`);
    } else {
        loginForm.reset();
        checkUserSession();
    }
});

// Handle logout actions
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.hash = ''; // Boot user back to public library page
});

// --- DATA READ OPERATION ---
// Replace the fetchPublicBooks function in app.js with this safer version:
async function fetchPublicBooks() {
    const listDiv = document.getElementById('books-list');
    listDiv.innerHTML = "Loading books...";

    try {
        const {data, error} = await supabase
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
    const {data, error} = await supabase.rpc('insert_complete_book', {book_payload: payload});

    if (error) {
        alert(`Error saving book: ${error.message}`);
    } else {
        alert("Book successfully added!");
        addBookForm.reset();
        window.location.hash = ''; // Return to the public view to see the addition
    }
});
