const pageTitleInput = document.getElementById('newPageTitle');
const pageFileInput = document.getElementById('newPageFile');
const addPageBtn = document.getElementById('addPageBtn');
const pagesList = document.getElementById('pagesList');

const globalTickTimeInput = document.getElementById('globalTickTime');
const globalTickUnitInput = document.getElementById('globalTickUnit');

function saveGlobalTickSettings() {
    if (!globalTickTimeInput || !globalTickUnitInput) return;
    const settings = {
        tickTime: globalTickTimeInput.value,
        tickUnit: globalTickUnitInput.value
    };
    try {
        localStorage.setItem('global_tick_settings', JSON.stringify(settings));
    } catch (e) {}
}

function loadGlobalTickSettings() {
    if (!globalTickTimeInput || !globalTickUnitInput) return;
    try {
        const settings = JSON.parse(localStorage.getItem('global_tick_settings') || '{}');
        if (settings.tickTime !== undefined) globalTickTimeInput.value = settings.tickTime;
        if (settings.tickUnit !== undefined) globalTickUnitInput.value = settings.tickUnit;
    } catch (e) {}
}

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
    renderCustomPages();
}

function deleteCustomPage(index) {
    const pages = getCustomPages();
    pages.splice(index, 1);
    try {
        localStorage.setItem('hub_custom_pages', JSON.stringify(pages));
    } catch (e) {}
    renderCustomPages();
}

function renderCustomPages() {
    document.querySelectorAll('.custom-page-item').forEach(el => el.remove());

    const customPages = getCustomPages();
    customPages.forEach((p, idx) => {
        const container = document.createElement('div');
        container.className = 'custom-page-item';
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

if (globalTickTimeInput && globalTickUnitInput) {
    [globalTickTimeInput, globalTickUnitInput].forEach(el => {
        el.addEventListener('input', saveGlobalTickSettings);
        el.addEventListener('change', saveGlobalTickSettings);
        el.addEventListener('keyup', saveGlobalTickSettings);
    });
    loadGlobalTickSettings();
}

renderCustomPages();
