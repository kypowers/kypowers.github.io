const {Pool} = require('pg');
const pool = new Pool(); // Assumes environment variables are set up for connection


async function saveNewBook(bookPayload) {
    const {data, error} = await supabase
        .rpc('insert_complete_book', {book_data: bookPayload});

    if (error) {
        console.error("Failed to save book:", error);
    } else {
        console.log("Book saved successfully!", data);
    }
}

// 1. Initialize Supabase
const supabase = supabase.createClient('YOUR_URL', 'YOUR_ANON_KEY');

// 2. Simple Admin Login Function
async function adminLogin(email, password) {
    const {data, error} = await supabase.auth.signInWithPassword({email, password});
    if (error) alert("Login failed: " + error.message);
    else alert("Welcome back, Admin!");
}

// 3. Insert Book Function (Only works if you are logged in)
async function submitBookToDatabase(bookPayload) {
    const {data, error} = await supabase.rpc('insert_complete_book', {
        book_payload: bookPayload
    });

    if (error) {
        console.error("Failed to insert:", error.message);
        alert("Error: Access denied or malformed data.");
    } else {
        alert(`Success! Book added with ID: ${data}`);
    }
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function insertCompleteBook(bookData) {
    const client = await pool.connect();

    try {
        // 1. Start the Transaction
        await client.query('BEGIN');

        // 2. Handle or Lookup the Series (if provided)
        let seriesId = null;
        if (bookData.series_title) {
            const seriesRes = await client.query(
                `INSERT INTO series (title)
                 VALUES ($1)
                 ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
                 -- Use custom conflict handling or pre-lookup if title isn't UNIQUE
                 RETURNING id`,
                [bookData.series_title]
            );
            // Alternative standard pattern if title isn't unique:
            // Try SELECT first, if not found, INSERT. Let's assume unique/pre-handled for speed.
        }

        // 3. Insert Core Book Data
        const bookQuery = `
            INSERT INTO books (title, description, cover_image_url, isbn_13, series_id, series_number, book_rating,
                               spice_level, total_pages)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id;
        `;
        const bookValues = [
            bookData.title, bookData.description, bookData.cover_image_url, bookData.isbn_13,
            bookData.series_id || null, bookData.series_number || null,
            bookData.book_rating || null, bookData.spice_level || null, bookData.total_pages || null
        ];
        const bookResult = await client.query(bookQuery, bookValues);
        const bookId = bookResult.rows[0].id;

        // 4. Helper Function to Handle Many-to-Many Lookups & Inserts
        // This inserts text items into their lookup tables, ignoring duplicates, and returns their IDs
        const getEntityIds = async (table, items) => {
            if (!items || items.length === 0) return [];
            const ids = [];
            for (const name of items) {
                const res = await client.query(
                    `INSERT INTO ${table} (name)
                     VALUES ($1)
                     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                     RETURNING id`,
                    [name]
                );
                ids.push(res.rows[0].id);
            }
            return ids;
        };

        // Get database IDs for all your text tags
        const authorIds = await getEntityIds('authors', bookData.authors);
        const tropeIds = await getEntityIds('tropes', bookData.tropes);
        const creatureIds = await getEntityIds('creatures', bookData.creatures);
        const categoryIds = await getEntityIds('categories', bookData.categories);

        // 5. Insert Book Relationships into Junction Tables
        for (const authorId of authorIds) {
            await client.query(`INSERT INTO book_authors (book_id, author_id)
                                VALUES ($1, $2)`, [bookId, authorId]);
        }
        for (const tropeId of tropeIds) {
            await client.query(`INSERT INTO book_tropes (book_id, trope_id)
                                VALUES ($1, $2)`, [bookId, tropeId]);
        }
        for (const creatureId of creatureIds) {
            await client.query(`INSERT INTO book_creatures (book_id, creature_id)
                                VALUES ($1, $2)`, [bookId, creatureId]);
        }
        for (const categoryId of categoryIds) {
            await client.query(`INSERT INTO book_categories (book_id, category_id)
                                VALUES ($1, $2)`, [bookId, categoryId]);
        }

        // 6. Create the Initial Reading Log (e.g., "Want to Read" or "Completed")
        if (bookData.reading_log) {
            const log = bookData.reading_log;
            const logQuery = `
                INSERT INTO reading_logs (book_id, status, format, current_page_or_percent, date_started, date_finished,
                                          narrator_rating, notes, final_review)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id;
            `;
            const logValues = [
                bookId, log.status, log.format, log.current_page_or_percent || 0,
                log.date_started || null, log.date_finished || null, log.narrator_rating || null,
                log.notes || null, log.final_review || null
            ];
            const logResult = await client.query(logQuery, logValues);
            const logId = logResult.rows[0].id;

            // 7. Insert Narrators linked specifically to this Reading Log
            const narratorIds = await getEntityIds('narrators', log.narrators);
            for (const narratorId of narratorIds) {
                await client.query(`INSERT INTO reading_log_narrators (reading_log_id, narrator_id)
                                    VALUES ($1, $2)`, [logId, narratorId]);
            }
        }

        // Commit Transaction if everything succeeds
        await client.query('COMMIT');
        return {success: true, bookId};

    } catch (error) {
        // Rollback changes if anything crashes
        await client.query('ROLLBACK');
        console.error("Failed to insert book transaction:", error);
        throw error;
    } finally {
        // Always release the database client back to the pool
        client.release();
    }
}
