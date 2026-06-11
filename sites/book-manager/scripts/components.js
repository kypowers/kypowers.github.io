document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('sidebar-container');
    if (container) {
        fetch('./sidebar.html')
            .then(res => res.text())
            .then(htmlString => {
                container.innerHTML = htmlString;
            });
    }
});


// document.addEventListener('DOMContentLoaded', () => {
//     const container = document.getElementById('sidebar-container');
//     if (!container) return;
//
//     // 1. Detect if the app is running locally or on GitHub Pages
//     const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
//
//     let basePath = '';
//
//     if (isLocalhost) {
//         // IntelliJ adds the project folder name to the URL path (e.g., /MyBookApp/index.html)
//         // This grabs that exact project folder name dynamically
//         const pathSegments = window.location.pathname.split('/');
//         basePath = `/${pathSegments[1]}/`;
//     } else {
//         // On GitHub Pages, your root folder is your repository name (e.g., /repository-name/)
//         const pathSegments = window.location.pathname.split('/');
//         basePath = `/${pathSegments[1]}/`;
//     }
//
//     // 2. Fetch the sidebar using the calculated absolute root path
//     fetch(`${window.location.origin}${basePath}sidebar.html`)
//         .then(res => {
//             if (!res.ok) throw new Error(`Could not find sidebar.html at root path.`);
//             return res.text();
//         })
//         .then(htmlString => {
//             container.innerHTML = htmlString;
//         })
//         .catch(err => console.error("Sidebar injection error:", err));
// });
