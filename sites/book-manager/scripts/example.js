// Initialize Supabase client
const SUPABASE_URL = 'https://supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Grab HTML Elements
const productForm = document.getElementById('productForm');
const loadBtn = document.getElementById('loadBtn');
const productDisplay = document.getElementById('productDisplay');

// --- EVENT LISTENERS ---

// A. Handle Form Submission (CREATE)
productForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevents page from reloading

    const nameInput = document.getElementById('prodName').value;
    const priceInput = parseFloat(document.getElementById('prodPrice').value);

    const {data, error} = await supabase
        .from('products')
        .insert([{name: nameInput, price: priceInput}])
        .select();

    if (error) {
        alert('Failed to save product!');
        return console.error(error);
    }

    alert('Product saved successfully!');
    productForm.reset(); // Clears form fields
    await fetchAndRenderProducts(); // Refresh the list automatically
});

// B. Handle Button Click (READ)
loadBtn.addEventListener('click', fetchAndRenderProducts);

// --- FUNCTIONS ---

// Helper function to fetch data and build the HTML structure
async function fetchAndRenderProducts() {
    productDisplay.innerHTML = 'Loading...';

    const {data: products, error} = await supabase
        .from('products')
        .select('*');

    if (error) {
        productDisplay.innerHTML = 'Error loading data.';
        return console.error(error);
    }

    // Clear display and rebuild list
    productDisplay.innerHTML = '';

    if (products.length === 0) {
        productDisplay.innerHTML = '<p>No products found.</p>';
        return;
    }

    products.forEach(product => {
        // Create a wrapper card for each product item
        const productCard = document.createElement('div');
        productCard.style.border = '1px solid #ccc';
        productCard.style.padding = '10px';
        productCard.style.margin = '5px 0';

        // Populate card text, adding inline action buttons for UPDATE and DELETE
        productCard.innerHTML = `
      <h3>${product.name}</h3>
      <p>Price: $${product.price}</p>
      <button onclick="handleDelete(${product.id})">Delete</button>
      <button onclick="handleUpdatePrice(${product.id})">Change Price</button>
    `;

        productDisplay.appendChild(productCard);
    });
}

// C. Handle Inline Button Click (DELETE)
async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this?')) return;

    const {error} = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) return alert('Delete failed!');
    fetchAndRenderProducts(); // Refresh the UI list
}

// D. Handle Inline Button Click (UPDATE)
async function handleUpdatePrice(id) {
    const newPrice = prompt('Enter a new price:');
    if (!newPrice || isNaN(newPrice)) return alert('Invalid price entered');

    const {error} = await supabase
        .from('products')
        .update({price: parseFloat(newPrice)})
        .eq('id', id);

    if (error) return alert('Update failed!');
    fetchAndRenderProducts(); // Refresh the UI list
}

// Make functions accessible globally so inline HTML onclick handlers can see them
window.handleDelete = handleDelete;
window.handleUpdatePrice = handleUpdatePrice;
