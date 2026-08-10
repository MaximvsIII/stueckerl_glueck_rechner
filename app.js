/**
 * APP.JS - Versione Premium Restyling
 */
const App = (() => {
  const state = {
    db: null,
    activeView: 'home-view',
    currentCakeId: null,
    lang: 'it'
  };

  function t(key) {
    const lang = state.lang || 'it';
    return (Translations[lang] && Translations[lang][key]) || (Translations['it'][key]) || key;
  }

  function detectLanguage() {
    const userLang = navigator.language || navigator.userLanguage;
    if (userLang.startsWith('de')) {
      state.lang = 'de';
    } else {
      state.lang = 'it';
    }
  }

  function applyStaticTranslations() {
    // Header
    const topbarH1 = document.querySelector('.topbar h1');
    if (topbarH1) topbarH1.textContent = t('appTitle');

    // Home View
    const welcomeH2 = document.querySelector('#home-view h2');
    if (welcomeH2) welcomeH2.textContent = t('welcome');
    const newCakeHomeBtn = document.getElementById('new-cake-home');
    if (newCakeHomeBtn) newCakeHomeBtn.innerHTML = `<span>+</span> <strong>${t('newProject')}</strong>`;
    const latestCreationsH3 = document.querySelector('#home-view .section-title-row h3');
    if (latestCreationsH3) latestCreationsH3.textContent = t('latestCreations');

    // Cakes View
    const archiveH3 = document.querySelector('#cakes-view .section-title-row h3');
    if (archiveH3) archiveH3.textContent = t('archive');

    // Ingredients View
    const pantryH3 = document.querySelector('#ingredients-view .section-title-row h3');
    if (pantryH3) pantryH3.textContent = t('pantry');

    // Settings View
    const settingsH3 = document.querySelector('#settings-view .section-title-row h3');
    if (settingsH3) settingsH3.textContent = t('settings');

    // Back button
    const backBtn = document.getElementById('back-to-cakes');
    if (backBtn) backBtn.textContent = t('back');

    // Nav Items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const view = item.getAttribute('data-view');
      const small = item.querySelector('small');
      if (small) {
        if (view === 'home-view') small.textContent = t('home');
        if (view === 'cakes-view') small.textContent = t('torte');
        if (view === 'ingredients-view') small.textContent = t('dispensa');
        if (view === 'settings-view') small.textContent = t('impostazioni');
      }
    });
  }

  const currencyFormatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  });

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').then(reg => {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Silenzioso o con notifica discreta
              }
            });
          });
        });
      });
    }
  }

  function wireGlobalEvents() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        switchView(btn.getAttribute('data-view'));
      };
    });

    const safeBind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = (e) => { e.preventDefault(); fn(); };
    };

    safeBind('new-cake-home', () => openCakeModal());
    safeBind('new-cake-cakes', () => openCakeModal());
    safeBind('new-ingredient-btn', () => openIngredientModal());
    safeBind('back-to-cakes', () => switchView('cakes-view'));
    safeBind('close-modal', closeModal);

    const modal = document.getElementById('modal');
    if (modal) {
      modal.onclick = (e) => { if (e.target.id === 'modal') closeModal(); };
    }
  }

  async function initDB() {
    try {
      state.db = await CakeDB.init(state.lang);
      const settings = await CakeDB.getAll('settings', state.db);
      if (settings.length === 0) {
        await CakeDB.addRecord('settings', state.db, {
          currency: 'EUR', laborHourlyRate: 15, energyCostPerKwh: 0.35, defaultMargin: 60,
          createdAt: new Date().toISOString()
        });
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  // --- RENDERING ---

  async function renderAll() {
    if (!state.db) return;
    await Promise.all([renderHome(), renderIngredients(), renderCakes(), renderSettings()]);
  }

  async function renderHome() {
    const list = document.getElementById('latest-cakes-list');
    if (!list) return;
    const cakes = await CakeDB.getAll('cakes', state.db);
    cakes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latest = cakes.slice(0, 5);

    list.innerHTML = latest.length ? latest.map(cake => {
      const imgHtml = cake.imageData
        ? `<img src="${URL.createObjectURL(cake.imageData)}" class="cake-thumb">`
        : `<div class="image-placeholder">🎂</div>`;

      return `
      <div class="card" onclick="App.openCakeDetail(${cake.id})">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">
          <div style="display:flex; align-items:center; gap:12px;">
            ${imgHtml}
            <div>
              <p class="eyebrow" style="color:var(--accent-soft); margin:0;">${t('customCake')}</p>
              <h4>${escapeHtml(cake.name)}</h4>
            </div>
          </div>
          <span style="font-size:1.2rem; opacity:0.5;">→</span>
        </div>

        <div style="margin-top:15px; display:grid; gap:8px; border-top:1px solid var(--border); padding-top:12px;">
          <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
            <span style="color:var(--text-muted);">${t('totalCost')}:</span>
            <span style="font-weight:500;">${formatCurrency(cake.totalCost)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
            <span style="color:var(--accent);">${t('salePrice')}:</span>
            <span style="font-weight:700; color:var(--accent);">${formatCurrency(cake.salePrice)}</span>
          </div>
        </div>
      </div>
    `}).join('') : `<div class="card" style="text-align:center; padding:30px;"><p>${t('noCakesSaved')}</p></div>`;
  }

  async function renderIngredients() {
    const list = document.getElementById('ingredients-list');
    if (!list) return;
    const items = await CakeDB.getAll('ingredients', state.db);
    items.sort((a, b) => a.name.localeCompare(b.name));

    list.innerHTML = items.map(ing => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <p class="eyebrow" style="margin:0;">${escapeHtml(ing.category || t('defaultIngredientCategory'))}</p>
            <h4 style="margin:2px 0 8px 0;">${escapeHtml(ing.name)}</h4>
            <p style="font-family:var(--font-mono); font-size:0.85rem;">
              ${ing.packageQuantity}${ing.unitType} @ <span style="color:var(--accent);">${formatCurrency(ing.packagePrice)}</span>
            </p>
          </div>
          <button class="btn btn-secondary" style="width:auto; padding:8px 12px; font-size:0.8rem;" onclick="App.openIngredientModal(${ing.id})">${t('edit')}</button>
        </div>
      </div>
    `).join('');
  }

  async function renderCakes() {
    const list = document.getElementById('cakes-list');
    if (!list) return;
    const cakes = await CakeDB.getAll('cakes', state.db);
    cakes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    list.innerHTML = cakes.length ? cakes.map(cake => {
      const imgHtml = cake.imageData
        ? `<img src="${URL.createObjectURL(cake.imageData)}" class="cake-thumb">`
        : `<div class="image-placeholder">🎂</div>`;

      return `
      <div class="card" onclick="App.openCakeDetail(${cake.id})">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            ${imgHtml}
            <h4>${escapeHtml(cake.name)}</h4>
          </div>
          <span style="font-size:1.2rem; opacity:0.5;">→</span>
        </div>

        <div style="margin-top:15px; display:grid; gap:8px; border-top:1px solid var(--border); padding-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
            <span style="color:var(--text-muted);">${t('salePrice')}</span>
            <span style="font-weight:700; color:var(--accent);">${formatCurrency(cake.salePrice)}</span>
          </div>
        </div>
      </div>
    `}).join('') : `<div class="card" style="text-align:center; padding:30px;"><p>${t('noCakesInArchive')}</p></div>`;
  }

  async function renderSettings() {
    const cont = document.getElementById('settings-content');
    if (!cont) return;
    const s = (await CakeDB.getAll('settings', state.db))[0] || {};
    cont.innerHTML = `
      <div class="settings-box">
        <label>${t('currencyDefault')}</label>
        <input type="text" value="${s.currency || 'EUR'}" readonly style="margin-bottom:20px;">

        <label>${t('language')}</label>
        <select onchange="App.changeLanguage(this.value)" style="margin-bottom:20px; width:100%; padding:12px; border-radius:8px; background:var(--bg-card); color:var(--text-main); border:1px solid var(--border-color);">
          <option value="it" ${state.lang === 'it' ? 'selected' : ''}>Italiano</option>
          <option value="de" ${state.lang === 'de' ? 'selected' : ''}>Deutsch</option>
        </select>

        <div style="display:flex; flex-direction:column; gap:12px;">
          <button class="btn btn-secondary" onclick="App.restoreIngredients()">
            <span>🔄</span> ${t('restoreIngredients')}
          </button>
          <button class="btn btn-danger" onclick="App.resetAllData()">
            <span>🗑️</span> ${t('deleteAllData')}
          </button>
        </div>
      </div>
      <p style="text-align:center; font-size:0.7rem; color:var(--text-muted); margin-top:20px;">${t('version')} 1.2.0</p>
    `;
  }

  function changeLanguage(newLang) {
    state.lang = newLang;
    applyStaticTranslations();
    renderAll();
  }

  // --- AZIONI ---

  async function openCakeDetail(id) {
    state.currentCakeId = id;
    const cake = await CakeDB.getById('cakes', state.db, id);
    if (!cake) return;

    const cakeIngredients = await CakeDB.getAllByIndex('cakeIngredients', state.db, 'cakeId', id);

    let profitClass = 'mid';
    if (cake.marginPercent >= 60) profitClass = 'high';
    if (cake.marginPercent < 40) profitClass = 'low';

    const detail = document.getElementById('cake-detail-content');

    const heroImgHtml = cake.imageData
      ? `<img src="${URL.createObjectURL(cake.imageData)}" class="cake-hero-img" onclick="App.triggerImageUpload()">`
      : `<div class="upload-zone" onclick="App.triggerImageUpload()">
           <span style="font-size:2rem; display:block; margin-bottom:10px;">📸</span>
           <p style="margin:0; font-size:0.8rem; color:var(--text-muted);">${t('addPhoto')}</p>
         </div>`;

    detail.innerHTML = `
      <div class="detail-panel">
        ${heroImgHtml}
        <input type="file" id="cake-image-input" accept="image/*" style="display:none;" onchange="App.handleImageUpload(event, ${id})">

        <p class="eyebrow" style="color:var(--accent);">${t('technicalDetails')}</p>
        <h2 style="margin:5px 0 25px 0; font-size:2.2rem;">${escapeHtml(cake.name)}</h2>

        <div class="section-block" style="margin-bottom:30px;">
          <div class="section-title-row">
            <h3 style="font-size:0.65rem;">${t('composition')}</h3>
            <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.7rem;" onclick="App.openAddIngredientToCakeModal(${id})">+ ${t('addIngredient')}</button>
          </div>
          <div id="cake-ingredients-list" class="mini-list">
            ${cakeIngredients.length ? cakeIngredients.map(ci => `
              <div class="cost-line" style="padding:10px 0;">
                <div>
                  <p style="margin:0; font-weight:500; color:var(--text-main);">${escapeHtml(ci.name)}</p>
                  <p style="margin:0; font-size:0.75rem; color:var(--text-muted);">${ci.amount}${ci.unitType}</p>
                </div>
                <div style="text-align:right;">
                  <p style="margin:0; font-weight:600;">${formatCurrency(ci.usedCost)}</p>
                  <button class="btn-text-danger" onclick="App.removeIngredientFromCake(${ci.id}, ${id})">${t('remove')}</button>
                </div>
              </div>
            `).join('') : `<p style="font-size:0.85rem; color:var(--text-muted); padding:10px 0;">${t('noIngredientsAdded')}</p>`}
          </div>
        </div>

        <div class="cost-line"><span>${t('costIngredients')}</span> <span>${formatCurrency(cake.ingredientCost)}</span></div>
        <div class="cost-line"><span>${t('decorationsExtra')}</span> <span>${formatCurrency(cake.decorationCost)}</span></div>
        <div class="cost-line"><span>${t('energyUtilities')}</span> <span>${formatCurrency(cake.energyCost)}</span></div>
        <div class="cost-line"><span>${t('laborCost')}</span> <span>${formatCurrency(cake.laborCost)}</span></div>

        <div class="cost-line" style="border-top:2px solid var(--accent); margin-top:15px; padding-top:15px;">
          <span style="font-weight:700; color:var(--text-main);">${t('totalCostLabel')}</span>
          <span style="font-weight:700; color:var(--text-main);">${formatCurrency(cake.totalCost)}</span>
        </div>

        <div class="cost-line" style="border:none;">
          <span style="font-weight:700; color:var(--accent);">${t('salePriceLabel')}</span>
          <span style="font-weight:700; color:var(--accent);">${formatCurrency(cake.salePrice)}</span>
        </div>

        <div class="profit-badge ${profitClass}">
          <p style="margin:0; font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.1em;">${t('netProfit')} (${Math.round(cake.marginPercent)}%)</p>
          <p style="margin:5px 0 0 0; font-size:2rem; font-weight:700;">${formatCurrency(cake.profit)}</p>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:30px;">
           <button class="btn btn-secondary" onclick="App.openEditCakeModal(${id})">${t('technicalDetails')}</button>
           <button class="btn btn-danger" onclick="App.deleteCake(${id})">${t('deleteProject')}</button>
        </div>
      </div>
    `;
    switchView('cake-detail-view');
  }

  async function openAddIngredientToCakeModal(cakeId) {
    const allIngredients = await CakeDB.getAll('ingredients', state.db);
    openModal(`
      <p class="eyebrow">COMPOSIZIONE</p>
      <h3 style="font-size:1.6rem; margin-bottom:25px; font-weight:700;">Aggiungi Ingrediente</h3>

      <label>Seleziona dalla Dispensa</label>
      <select id="m-add-ing-id" style="margin-bottom:20px;">
        ${allIngredients.map(ing => `<option value="${ing.id}">${escapeHtml(ing.name)} (${ing.unitType})</option>`).join('')}
      </select>

      <label>Quantità Utilizzata</label>
      <input type="number" id="m-add-ing-amount" placeholder="es. 250" style="margin-bottom:30px;">

      <button class="btn btn-primary" onclick="App.addIngredientToCake(${cakeId})">AGGIUNGI ALLA TORTA</button>
    `);
  }

  async function addIngredientToCake(cakeId) {
    const ingId = Number(document.getElementById('m-add-ing-id').value);
    const amount = Number(document.getElementById('m-add-ing-amount').value);
    if (!amount || amount <= 0) return alert("Inserisci una quantità valida");

    const ing = await CakeDB.getById('ingredients', state.db, ingId);
    const usedCost = amount * ing.unitCost;

    await CakeDB.addRecord('cakeIngredients', state.db, {
      cakeId,
      ingredientId: ingId,
      name: ing.name,
      amount,
      unitType: ing.unitType,
      usedCost
    });

    const cake = await CakeDB.getById('cakes', state.db, cakeId);
    await CakeDB.syncCakeTotals(state.db, cakeId, cake);

    closeModal();
    openCakeDetail(cakeId);
  }

  async function removeIngredientFromCake(ciId, cakeId) {
    await CakeDB.deleteRecord('cakeIngredients', state.db, ciId);
    const cake = await CakeDB.getById('cakes', state.db, cakeId);
    await CakeDB.syncCakeTotals(state.db, cakeId, cake);
    openCakeDetail(cakeId);
  }

  function openModal(html) {
    const content = document.getElementById('modal-content');
    if (content) {
      content.innerHTML = html;
      document.getElementById('modal').classList.remove('hidden');
    }
  }

  function closeModal() {
    document.getElementById('modal').classList.add('hidden');
  }

  async function openCakeModal() {
    openModal(`
      <p class="eyebrow">${t('creation')}</p>
      <h3 style="font-size:1.6rem; margin-bottom:25px; font-weight:700; letter-spacing:-0.03em;">${t('newProjectTitle')}</h3>
      <label>${t('cakeName')}</label>
      <input type="text" id="m-cake-name" placeholder="${t('cakeNamePlaceholder')}" style="margin-bottom:25px">
      <button class="btn btn-primary" onclick="App.saveNewCake()">${t('startProject')}</button>
    `);
  }

  async function saveNewCake() {
    const name = document.getElementById('m-cake-name').value.trim();
    if (!name) return alert(t('alertInvalidData'));
    const id = await CakeDB.addRecord('cakes', state.db, {
      name, createdAt: new Date().toISOString(),
      ingredientCost:0, decorationCost:0, packagingCost:0, energyCost:0, laborCost:0,
      totalCost:0, salePrice:0, profit:0, marginPercent:0
    });
    closeModal();
    await renderAll();
    openCakeDetail(id);
  }

  async function openIngredientModal(id = null) {
    const ing = id ? await CakeDB.getById('ingredients', state.db, id) : null;
    openModal(`
      <p class="eyebrow">${id ? t('edit').toUpperCase() : t('addIngredient').split(' ')[0].toUpperCase()}</p>
      <h3 style="font-size:1.6rem; margin-bottom:25px; font-weight:700; letter-spacing:-0.03em;">${t('defaultIngredientCategory')}</h3>

      <label>${t('name')}</label>
      <input type="text" id="m-ing-name" value="${ing ? escapeHtml(ing.name) : ''}" style="margin-bottom:20px">

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:20px;">
        <div>
          <label>${t('quantity')}</label>
          <input type="number" id="m-ing-qty" value="${ing ? ing.packageQuantity : ''}">
        </div>
        <div>
          <label>${t('unit')}</label>
          <select id="m-ing-unit">
            <option value="g" ${ing?.unitType==='g'?'selected':''}>Grammi (g)</option>
            <option value="kg" ${ing?.unitType==='kg'?'selected':''}>Chili (kg)</option>
            <option value="ml" ${ing?.unitType==='ml'?'selected':''}>Millilitri (ml)</option>
            <option value="piece" ${ing?.unitType==='piece'?'selected':''}>Pezzi (pz)</option>
          </select>
        </div>
      </div>

      <label>${t('packagePriceLabel')}</label>
      <input type="number" step="0.01" id="m-ing-price" value="${ing ? ing.packagePrice : ''}" style="margin-bottom:30px">

      <button class="btn btn-primary" onclick="App.saveIngredient(${id})">${t('saveInPantry')}</button>
      ${id ? `<button class="btn btn-ghost" style="margin-top:12px; color:var(--danger); border-color:rgba(255,94,94,0.2);" onclick="App.deleteIngredient(${id})">${t('delete').toUpperCase()}</button>` : ''}
    `);
  }

  async function saveIngredient(id) {
    const name = document.getElementById('m-ing-name').value.trim();
    const qty = Number(document.getElementById('m-ing-qty').value);
    const price = Number(document.getElementById('m-ing-price').value);
    const unit = document.getElementById('m-ing-unit').value;

    if (!name || qty <= 0) return alert(t('alertInvalidData'));

    const unitCost = price / qty;
    const data = { name, packageQuantity: qty, packagePrice: price, unitType: unit, unitCost, updatedAt: new Date().toISOString() };

    if (id) {
      const old = await CakeDB.getById('ingredients', state.db, id);
      await CakeDB.putRecord('ingredients', state.db, { ...old, ...data });
    } else {
      await CakeDB.addRecord('ingredients', state.db, { ...data, createdAt: new Date().toISOString() });
    }
    closeModal();
    await renderIngredients();
  }

  async function deleteCake(id) {
    if (confirm(t('confirmDeleteCake'))) {
      await CakeDB.deleteRecord('cakes', state.db, id);
      closeModal();
      switchView('cakes-view');
      await renderAll();
    }
  }

  async function deleteIngredient(id) {
    if (confirm(t('confirmDeleteIngredient'))) {
      await CakeDB.deleteRecord('ingredients', state.db, id);
      closeModal();
      await renderIngredients();
    }
  }

  async function resetAllData() {
    if (confirm(t('confirmResetData'))) {
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => window.indexedDB.deleteDatabase(db.name));
      window.location.reload();
    }
  }

  async function restoreIngredients() {
    if (!state.db) return;
    try {
      await CakeDB.seedDemoData(state.db, state.lang);
      alert(t('alertPantryRestored'));
      await renderIngredients();
    } catch (e) {
      alert(t('alertError'));
    }
  }

  function switchView(viewName) {
    state.activeView = viewName;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === viewName));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.getAttribute('data-view') === viewName));
    window.scrollTo(0,0);
  }

  async function openEditCakeModal(id) {
    const cake = await CakeDB.getById('cakes', state.db, id);
    openModal(`
      <p class="eyebrow">${t('technicalDetails')}</p>
      <h3 style="font-size:1.6rem; margin-bottom:20px; font-weight:700;">${t('edit')} ${escapeHtml(cake.name)}</h3>

      <label>${t('name')}</label>
      <input type="text" id="e-cake-name" value="${escapeHtml(cake.name)}" style="margin-bottom:15px">

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
        <div>
          <label>${t('decorations')} (€)</label>
          <input type="number" step="0.01" id="e-cake-dec" value="${cake.decorationCost || 0}">
        </div>
        <div>
          <label>${t('packaging')} (€)</label>
          <input type="number" step="0.01" id="e-cake-pack" value="${cake.packagingCost || 0}">
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
        <div>
          <label>${t('labor')} (€)</label>
          <input type="number" step="0.01" id="e-cake-labor" value="${cake.laborCost || 0}">
        </div>
        <div>
          <label>${t('energy')} (€)</label>
          <input type="number" step="0.01" id="e-cake-energy" value="${cake.energyCost || 0}">
        </div>
      </div>

      <label>${t('salePrice')} (€)</label>
      <input type="number" step="0.01" id="e-cake-sale" value="${cake.salePrice || 0}" style="margin-bottom:25px; border-color:var(--accent);">

      <button class="btn btn-primary" onclick="App.updateCakeDetails(${id})">${t('updateCalculations')}</button>
    `);
  }

  async function updateCakeDetails(id) {
    const cake = await CakeDB.getById('cakes', state.db, id);
    const data = {
      ...cake,
      name: document.getElementById('e-cake-name').value.trim(),
      decorationCost: Number(document.getElementById('e-cake-dec').value),
      packagingCost: Number(document.getElementById('e-cake-pack').value),
      laborCost: Number(document.getElementById('e-cake-labor').value),
      energyCost: Number(document.getElementById('e-cake-energy').value),
      salePrice: Number(document.getElementById('e-cake-sale').value)
    };

    await CakeDB.putRecord('cakes', state.db, data);
    await CakeDB.syncCakeTotals(state.db, id, data);
    closeModal();
    await openCakeDetail(id);
    await renderAll();
  }

  function triggerImageUpload() {
    const input = document.getElementById('cake-image-input');
    if (input) input.click();
  }

  async function handleImageUpload(event, cakeId) {
    const file = event.target.files[0];
    if (!file) return;

    // Opzionale: Qui potremmo ridimensionare l'immagine prima di salvarla per risparmiare spazio
    const cake = await CakeDB.getById('cakes', state.db, cakeId);
    cake.imageData = file;
    cake.updatedAt = new Date().toISOString();

    await CakeDB.putRecord('cakes', state.db, cake);
    await openCakeDetail(cakeId);
    await renderAll();
  }
  function formatCurrency(v) { return currencyFormatter.format(v || 0); }

  async function init() {
    detectLanguage();
    registerServiceWorker();
    wireGlobalEvents();
    applyStaticTranslations();
    const ok = await initDB();
    if (ok) {
      await renderAll();
    }
  }

  return {
    init, openCakeDetail, openCakeModal, saveNewCake, openIngredientModal, saveIngredient, deleteCake, deleteIngredient, resetAllData, restoreIngredients, openEditCakeModal, updateCakeDetails, openAddIngredientToCakeModal, addIngredientToCake, removeIngredientFromCake, triggerImageUpload, handleImageUpload, changeLanguage
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
