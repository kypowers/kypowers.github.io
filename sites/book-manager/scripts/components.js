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