import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';


const SUPABASE_URL = 'https://zloscdxigeruokwuppor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XsU1ogWFtYNKajfz7Oo69Q_dKYRYJfo';

const supabase = (SUPABASE_URL.includes('<REPLACE') || SUPABASE_ANON_KEY.includes('<REPLACE'))
    ? null
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BOOKS_PER_PAGE = 30;
let currentPage = 0;
let totalBooks = 0;

async function getTotalBooksCount() {
    if (!supabase) return 0;

    try {
        const {count, error} = await supabase
            .from('book')
            .select('*', {count: 'exact', head: true});

        if (error) throw error;
        return count || 0;
    } catch (err) {
        console.error('Error getting book count:', err);
        return 0;
    }
}

async function loadBooks(page = 0) {
    const bookList = document.getElementById('book-list');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');

    if (!bookList) return;

    bookList.textContent = 'Loading...';

    if (!supabase) {
        bookList.textContent = 'Supabase not configured. Please add your SUPABASE_URL and SUPABASE_ANON_KEY in scripts/books.js';
        return;
    }

    try {
        currentPage = page;
        const startRange = page * BOOKS_PER_PAGE;
        const endRange = startRange + BOOKS_PER_PAGE - 1;

        // Fetch books with related data (authors and series)
        const {data: books, error} = await supabase
            .from('book')
            .select(`
                id,
                title,
                description,
                rating,
                spice,
                read_date,
                series:series_id(name),
                series_order,
                book_author(author:author_id(first_name, last_name))
            `)
            .order('id', {ascending: false})
            .range(startRange, endRange);

        if (error) throw error;

        if (!books || books.length === 0) {
            bookList.innerHTML = '<p class="no-books">No books found.</p>';
            pageInfo.textContent = 'Page 1';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        // Render books
        bookList.innerHTML = books.map(book => {
            const authors = book.book_author
                ?.map(ba => `${ba.author.first_name} ${ba.author.last_name}`)
                .join(', ') || 'Unknown Author';

            const seriesInfo = book.series
                ? `${book.series.name} #${book.series_order || '?'}`
                : '';

            const ratingStars = book.rating ? '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating) : 'Not rated';
            const spiceLevel = book.spice ? '🌶️'.repeat(book.spice) : 'None';

            return `
                <div class="book-card" data-book-id="${book.id}">
                    <h3>${escapeHtml(book.title)}</h3>
                    <p class="book-author">${escapeHtml(authors)}</p>
                    ${seriesInfo ? `<p class="book-series">${escapeHtml(seriesInfo)}</p>` : ''}
                    <div class="book-meta">
                        <span class="book-rating" title="Rating">${ratingStars}</span>
                        <span class="book-spice" title="Spice Level">${spiceLevel}</span>
                    </div>
                    ${book.description ? `<p class="book-description">${escapeHtml(book.description.substring(0, 150))}${book.description.length > 150 ? '...' : ''}</p>` : ''}
                    ${book.read_date ? `<p class="book-read-date">Read: ${book.read_date}</p>` : ''}
                </div>
            `;
        }).join('');

        // Add click handlers to book cards
        document.querySelectorAll('.book-card').forEach(card => {
            card.addEventListener('click', () => {
                const bookId = card.dataset.bookId;
                openBookModal(bookId);
            });
        });

        // Update pagination UI
        const totalPages = Math.ceil(totalBooks / BOOKS_PER_PAGE);
        pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;

        // Enable/disable pagination buttons
        prevBtn.disabled = currentPage === 0;
        nextBtn.disabled = currentPage >= totalPages - 1;

    } catch (err) {
        bookList.innerHTML = `<p class="error">Failed to load books: ${escapeHtml(err.message || 'Unknown error')}</p>`;
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

async function openBookModal(bookId) {
    if (!supabase) return;

    try {
        // Fetch full book details with all related data
        const {data: books, error} = await supabase
            .from('book')
            .select(`
                id,
                title,
                description,
                rating,
                spice,
                read_date,
                series:series_id(name),
                series_order,
                categories(name),
                book_author(author:author_id(first_name, last_name)),
                book_narrator(narrator:narrator_id(first_name, last_name), performance_rating),
                book_tropes(tropes(name)),
                book_creatures(creatures(name))
            `)
            .eq('id', bookId);

        if (error) throw error;
        if (!books || books.length === 0) {
            console.error('Book not found');
            return;
        }

        const book = books[0];
        const modal = document.getElementById('book-modal');
        const modalBody = document.getElementById('modal-body');

        // Format book details
        const authors = book.book_author
            ?.map(ba => `${ba.author.first_name} ${ba.author.last_name}`)
            .join(', ') || 'Unknown Author';

        const narrators = book.book_narrator
            ?.map(bn => `${bn.narrator.first_name} ${bn.narrator.last_name}${bn.performance_rating ? ` (${bn.performance_rating}/5)` : ''}`)
            .join(', ') || '';

        const categories = book.categories
            ?.map(c => c.name)
            .join(', ') || '';

        const tropes = book.book_tropes
            ?.map(bt => bt.tropes.name)
            .join(', ') || '';

        const creatures = book.book_creatures
            ?.map(bc => bc.creatures.name)
            .join(', ') || '';

        const ratingStars = book.rating ? '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating) : 'Not rated';
        const spiceLevel = book.spice ? '🌶️'.repeat(book.spice) : 'None';

        const seriesInfo = book.series
            ? `${book.series.name} #${book.series_order || '?'}`
            : '';

        // Populate modal
        modalBody.innerHTML = `
            <div class="book-detail">
                <h2>${escapeHtml(book.title)}</h2>
                <p class="detail-author"><strong>Author:</strong> ${escapeHtml(authors)}</p>
                ${seriesInfo ? `<p class="detail-series"><strong>Series:</strong> ${escapeHtml(seriesInfo)}</p>` : ''}
                <div class="detail-meta">
                    <div class="detail-rating">
                        <strong>Rating:</strong> <span class="rating-stars">${ratingStars}</span>
                    </div>
                    <div class="detail-spice">
                        <strong>Spice Level:</strong> <span class="spice-level">${spiceLevel}</span>
                    </div>
                </div>
                ${book.read_date ? `<p class="detail-read-date"><strong>Read:</strong> ${book.read_date}</p>` : ''}
                ${categories ? `<p class="detail-categories"><strong>Categories:</strong> ${escapeHtml(categories)}</p>` : ''}
                ${narrators ? `<p class="detail-narrators"><strong>Narrators:</strong> ${escapeHtml(narrators)}</p>` : ''}
                ${tropes ? `<p class="detail-tropes"><strong>Tropes:</strong> ${escapeHtml(tropes)}</p>` : ''}
                ${creatures ? `<p class="detail-creatures"><strong>Creatures:</strong> ${escapeHtml(creatures)}</p>` : ''}
                ${book.description ? `
                    <div class="detail-description">
                        <strong>Description:</strong>
                        <p>${escapeHtml(book.description)}</p>
                    </div>
                ` : ''}
            </div>
        `;

        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (err) {
        console.error('Error loading book details:', err);
        alert('Failed to load book details');
    }
}

function closeBookModal() {
    const modal = document.getElementById('book-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Get total count first
    totalBooks = await getTotalBooksCount();

    // Load first page
    await loadBooks(0);

    // Set up pagination event listeners
    document.getElementById('prev-btn')?.addEventListener('click', () => {
        if (currentPage > 0) loadBooks(currentPage - 1);
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
        const totalPages = Math.ceil(totalBooks / BOOKS_PER_PAGE);
        if (currentPage < totalPages - 1) loadBooks(currentPage + 1);
    });

    // Set up modal event listeners
    const modal = document.getElementById('book-modal');
    const modalClose = document.getElementById('modal-close');

    // Close modal when close button is clicked
    modalClose?.addEventListener('click', closeBookModal);

    // Close modal when clicking outside the modal content
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBookModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeBookModal();
        }
    });
});
