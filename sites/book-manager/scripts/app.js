// app.js
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://zloscdxigeruokwuppor.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_XsU1ogWFtYNKajfz7Oo69Q_dKYRYJfo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


document.addEventListener('DOMContentLoaded', () => {
    console.log('HTML fully loaded. Fetching database records...');

    // Call your existing function to read and display data automatically
    fetchAndRenderProducts();
});

async function fetchAndRenderProducts() {
    const {data, error} = await supabase
        .from('books')
        .select('*');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    const productList = document.getElementById('product-list');
    if (!productList) {
        console.warn('No element with id "product-list" found to render products.');
        return;
    }
}


// 2. Your CRUD Functions
async function readProducts() {
    const {data, error} = await supabase
        .from('products')
        .select('*');

    if (error) return console.error('Error:', error);
    console.log('Products:', data);
}

// Example call to test it out
readProducts();


// - - - - - -

// Initialize the Supabase client
const SUPABASE_URL = 'https://supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Safe to be public

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Example function to fetch books and display them
async function fetchBooks() {
    const {data, error} = await supabase
        .from('books')
        .select(`
            id, 
            title, 
            description,
            book_authors ( authors ( name ) )
        `);

    if (error) {
        console.error('Error fetching books:', error);
        return;
    }

    const listDiv = document.getElementById('books-list');
    listDiv.innerHTML = data.map(book => `
        <div class="book-card">
            <h3>${book.title}</h3>
            <p>By: ${book.book_authors.map(ba => ba.authors.name).join(', ')}</p>
        </div>
    `).join('');
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', fetchBooks);
