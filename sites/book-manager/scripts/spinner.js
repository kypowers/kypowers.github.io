const LOADER_ID = 'pageLoader-overlay';

async function fetchServerData() {
    try {
        startLoader(); // 1. Turn spinner on before network call starts

        // const response = await fetch("https://example.com");
        // const data = await response.json();

        console.log("Data received:", data);
    } catch (error) {
        console.error("Request failed:", error);
    } finally {
        // stopLoader(); // 2. Turn spinner off completely whether it succeeds OR fails
    }
}

function ensureLoaderElement() {
    let loader = document.getElementById(LOADER_ID);
    if (loader) return loader;

    loader = document.createElement('div');
    loader.id = LOADER_ID;
    loader.innerHTML = `    <style id="${LOADER_ID}-styles">
      #${LOADER_ID} {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.9);
        z-index: 9999;
        transition: opacity 200ms ease, visibility 200ms ease;
      }
      #${LOADER_ID}.hidden { opacity: 0; visibility: hidden; pointer-events: none; }
      #${LOADER_ID} .spinner {
        width: 48px;
        height: 48px;
        border: 6px solid #e5e7eb;
        border-top: 6px solid #2563eb;
        border-radius: 50%;
        animation: loader-spin 0.9s linear infinite;
      }
      @keyframes loader-spin { to { transform: rotate(360deg); } }
    </style>
    <div class="spinner" aria-hidden="true"></div>
  `;
    document.body.appendChild(loader);
    return loader;
}

export function startLoader() {
    const loader = ensureLoaderElement();
    loader.classList.remove('hidden');
    // Prevent page scrolling while loader active
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
}

export function stopLoader() {
    const loader = ensureLoaderElement();
    loader.classList.add('hidden');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
}
