const pageTitleInput = document.getElementById('newPageTitle');
const pageFileInput = document.getElementById('newPageFile');
const addPageBtn = document.getElementById('addPageBtn');
const pagesList = document.getElementById('pagesList');

// Default built-in calculators
const BUILT_IN_PAGES = [
    {
        title: "RP Grind Calculator",
        desc: "Big number RP time calculator with custom rates and presets",
        file: "rp_calculator.html"
    },
    {
        title: "Shard Grind Calculator",
        desc: "Calculates tick-based operation and cooldown grind times",
        file: "shard_calculator.html"
    }
];

function getCustomPages() {
    try {
        return JSON.parse(localStorage.getItem('hub_custom_pages') || '[]');
    } catch (e) {
        return [];
    }
}

function addCustomPage() {
    const title = pageTitleInput.value.trim();
    let file = pageFileInput.value.trim();

    if (!title || !file) return;
    if (!file.endsWith('.html')) file += '.html';

    const pages = getCustomPages();
    pages.push({ title, file });

    try {
        localStorage.setItem('hub_custom_pages', JSON.stringify(pages));
    } catch (e) {}

    pageTitleInput.value = '';
    pageFileInput.value = '';
    renderPages();
}

function deleteCustomPage(index) {
    const pages = getCustomPages();
    pages.splice(index, 1);
    try {
        localStorage.setItem('hub_custom_pages', JSON.stringify(pages));
    } catch (e) {}
    renderPages();
}

function renderPages() {
    pagesList.innerHTML = '';

    // 1. Render Built-in Pages
    BUILT_IN_PAGES.forEach(p => {
        const a = document.createElement('a');
        a.className = 'page-card';
        a.href = p.file;
        a.innerHTML = `
            <div class="page-info">
                <span class="page-title">${p.title}</span>
                <span class="page-desc">${p.desc}</span>
            </div>
            <span>➔</span>
        `;
        pagesList.appendChild(a);
    });

    // 2. Render User Custom Pages
    const customPages = getCustomPages();
    customPages.forEach((p, idx) => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '6px';
        container.style.alignItems = 'center';

        const a = document.createElement('a');
        a.className = 'page-card';
        a.href = p.file;
        a.style.flex = '1';
        a.innerHTML = `
            <div class="page-info">
                <span class="page-title">${p.title}</span>
                <span class="page-desc">${p.file}</span>
            </div>
            <span>➔</span>
        `;

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger';
        delBtn.textContent = '✕';
        delBtn.onclick = () => deleteCustomPage(idx);

        container.appendChild(a);
        container.appendChild(delBtn);
        pagesList.appendChild(container);
    });
}

if (addPageBtn) {
    addPageBtn.addEventListener('click', addCustomPage);
}

renderPages();
