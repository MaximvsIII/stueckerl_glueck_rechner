/**
 * APP.JS - Versione Premium Restyling
 */
const App = (() => {
  const state = {
    db: null,
    activeView: 'home-view',
    currentCakeId: null
  };

  const currencyFormatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  });

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
      state.db = await CakeDB.init();
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

    list.innerHTML = latest.length ? latest.map(cake => `
      <div class="card" onclick="App.openCakeDetail(${cake.id})">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <p class="eyebrow" style="color:var(--accent-soft); margin:0;">TORTA PERSONALIZZATA</p>
            <h4>${escapeHtml(cake.name)}</h4>
          </div>
          <span style="font-size:1.5rem;">🎂</span>
        </div>
        <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
          <span class="value-pill">${formatCurrency(cake.totalCost)}</span>
          <span style="font-size:0.8rem; color:var(--text-muted);">Vedi dettagli →</span>
        </div>
      </div>
    `).join('') : '<div class="card" style="text-align:center; padding:30px;"><p>Nessuna torta salvata.</p></div>';
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
            <p class="eyebrow" style="margin:0;">${escapeHtml(ing.category || 'Ingrediente')}</p>
            <h4 style="margin:2px 0 8px 0;">${escapeHtml(ing.name)}</h4>
            <p style="font-family:var(--font-mono); font-size:0.85rem;">
              ${ing.packageQuantity}${ing.unitType} @ <span style="color:var(--accent);">${formatCurrency(ing.packagePrice)}</span>
            </p>
          </div>
          <button class="btn btn-secondary" style="width:auto; padding:8px 12px; font-size:0.8rem;" onclick="App.openIngredientModal(${ing.id})">Modifica</button>
        </div>
      </div>
    `).join('');
  }

  async function renderCakes() {
    const list = document.getElementById('cakes-list');
    if (!list) return;
    const cakes = await CakeDB.getAll('cakes', state.db);
    list.innerHTML = cakes.map(cake => `
      <div class="card" onclick="App.openCakeDetail(${cake.id})">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4>${escapeHtml(cake.name)}</h4>
          <span class="amount">${formatCurrency(cake.profit)}</span>
        </div>
        <p style="font-size:0.8rem;">Utile netto stimato</p>
      </div>
    `).join('');
  }

  async function renderSettings() {
    const cont = document.getElementById('settings-content');
    if (!cont) return;
    const s = (await CakeDB.getAll('settings', state.db))[0] || {};
    cont.innerHTML = `
      <div class="settings-box">
        <label>Valuta Predefinita</label>
        <input type="text" value="${s.currency || 'EUR'}" readonly style="margin-bottom:20px;">

        <div style="display:flex; flex-direction:column; gap:12px;">
          <button class="btn btn-secondary" onclick="App.restoreIngredients()">
            <span>🔄</span> RIPRISTINA INGREDIENTI
          </button>
          <button class="btn btn-danger" onclick="App.resetAllData()">
            <span>🗑️</span> ELIMINA TUTTI I DATI
          </button>
        </div>
      </div>
      <p style="text-align:center; font-size:0.7rem; color:var(--text-muted); margin-top:20px;">Versione Premium 1.2.0</p>
    `;
  }

  // --- AZIONI ---

  async function openCakeDetail(id) {
    state.currentCakeId = id;
    const cake = await CakeDB.getById('cakes', state.db, id);
    if (!cake) return;

    // Determina la classe del badge in base al margine
    let profitClass = 'mid';
    if (cake.marginPercent >= 60) profitClass = 'high';
    if (cake.marginPercent < 40) profitClass = 'low';

    const detail = document.getElementById('cake-detail-content');
    detail.innerHTML = `
      <div class="detail-panel">
        <p class="eyebrow" style="color:var(--accent);">RIEPILOGO COSTI</p>
        <h2 style="margin:5px 0 25px 0; font-size:2.2rem;">${escapeHtml(cake.name)}</h2>

        <div class="cost-line"><span>Ingredienti</span> <span>${formatCurrency(cake.ingredientCost)}</span></div>
        <div class="cost-line"><span>Decorazioni</span> <span>${formatCurrency(cake.decorationCost)}</span></div>
        <div class="cost-line"><span>Energia/Utenze</span> <span>${formatCurrency(cake.energyCost)}</span></div>
        <div class="cost-line"><span>Manodopera</span> <span>${formatCurrency(cake.laborCost)}</span></div>

        <div class="cost-line" style="border-top:2px solid var(--accent); margin-top:15px; padding-top:15px;">
          <span style="font-weight:700; color:var(--text-main);">COSTO TOTALE</span>
          <span style="font-weight:700; color:var(--text-main);">${formatCurrency(cake.totalCost)}</span>
        </div>

        <div class="cost-line" style="border:none;">
          <span style="font-weight:700; color:var(--accent);">PREZZO VENDITA</span>
          <span style="font-weight:700; color:var(--accent);">${formatCurrency(cake.salePrice)}</span>
        </div>

        <div class="profit-badge ${profitClass}">
          <p style="margin:0; font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.1em;">UTILE NETTO (${Math.round(cake.marginPercent)}%)</p>
          <p style="margin:5px 0 0 0; font-size:2rem; font-weight:700;">${formatCurrency(cake.profit)}</p>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:30px;">
           <button class="btn btn-secondary" onclick="App.openEditCakeModal(${id})">MODIFICA</button>
           <button class="btn btn-danger" onclick="App.deleteCake(${id})">ELIMINA</button>
        </div>
      </div>
    `;
    switchView('cake-detail-view');
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
      <p class="eyebrow">CREAZIONE</p>
      <h3 style="font-size:1.6rem; margin-bottom:25px; font-weight:700; letter-spacing:-0.03em;">Nuovo Progetto</h3>
      <label>Nome della Torta</label>
      <input type="text" id="m-cake-name" placeholder="es. Red Velvet Matrimonio" style="margin-bottom:25px">
      <button class="btn btn-primary" onclick="App.saveNewCake()">INIZIA PROGETTO</button>
    `);
  }

  async function saveNewCake() {
    const name = document.getElementById('m-cake-name').value.trim();
    if (!name) return alert("Inserisci un nome");
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
      <p class="eyebrow">${id ? 'MODIFICA' : 'AGGIUNGI'}</p>
      <h3 style="font-size:1.6rem; margin-bottom:25px; font-weight:700; letter-spacing:-0.03em;">Ingrediente</h3>

      <label>Nome</label>
      <input type="text" id="m-ing-name" value="${ing ? escapeHtml(ing.name) : ''}" style="margin-bottom:20px">

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:20px;">
        <div>
          <label>Quantità</label>
          <input type="number" id="m-ing-qty" value="${ing ? ing.packageQuantity : ''}">
        </div>
        <div>
          <label>Unità</label>
          <select id="m-ing-unit">
            <option value="g" ${ing?.unitType==='g'?'selected':''}>Grammi (g)</option>
            <option value="kg" ${ing?.unitType==='kg'?'selected':''}>Chili (kg)</option>
            <option value="ml" ${ing?.unitType==='ml'?'selected':''}>Millilitri (ml)</option>
            <option value="piece" ${ing?.unitType==='piece'?'selected':''}>Pezzi (pz)</option>
          </select>
        </div>
      </div>

      <label>Prezzo Confezione (€)</label>
      <input type="number" step="0.01" id="m-ing-price" value="${ing ? ing.packagePrice : ''}" style="margin-bottom:30px">

      <button class="btn btn-primary" onclick="App.saveIngredient(${id})">SALVA IN DISPENSA</button>
      ${id ? `<button class="btn btn-ghost" style="margin-top:12px; color:var(--danger); border-color:rgba(255,94,94,0.2);" onclick="App.deleteIngredient(${id})">ELIMINA</button>` : ''}
    `);
  }

  async function saveIngredient(id) {
    const name = document.getElementById('m-ing-name').value.trim();
    const qty = Number(document.getElementById('m-ing-qty').value);
    const price = Number(document.getElementById('m-ing-price').value);
    const unit = document.getElementById('m-ing-unit').value;

    if (!name || qty <= 0) return alert("Dati non validi");

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
    if (confirm("Sei sicuro di voler eliminare questa torta?")) {
      await CakeDB.deleteRecord('cakes', state.db, id);
      closeModal();
      switchView('cakes-view');
      await renderAll();
    }
  }

  async function deleteIngredient(id) {
    if (confirm("Eliminare l'ingrediente dalla dispensa?")) {
      await CakeDB.deleteRecord('ingredients', state.db, id);
      closeModal();
      await renderIngredients();
    }
  }

  async function resetAllData() {
    if (confirm("ATTENZIONE: Stai per cancellare tutte le torte e gli ingredienti. Procedere?")) {
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => window.indexedDB.deleteDatabase(db.name));
      window.location.reload();
    }
  }

  async function restoreIngredients() {
    if (!state.db) return;
    try {
      await CakeDB.seedDemoData(state.db);
      alert("Dispensa aggiornata con i dati predefiniti!");
      await renderIngredients();
    } catch (e) {
      alert("Errore durante l'aggiornamento.");
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
      <p class="eyebrow">DETTAGLI TECNICI</p>
      <h3 style="font-size:1.6rem; margin-bottom:20px; font-weight:700;">Modifica ${escapeHtml(cake.name)}</h3>

      <label>Nome Progetto</label>
      <input type="text" id="e-cake-name" value="${escapeHtml(cake.name)}" style="margin-bottom:15px">

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
        <div>
          <label>Decorazioni (€)</label>
          <input type="number" step="0.01" id="e-cake-dec" value="${cake.decorationCost || 0}">
        </div>
        <div>
          <label>Imballaggio (€)</label>
          <input type="number" step="0.01" id="e-cake-pack" value="${cake.packagingCost || 0}">
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
        <div>
          <label>Manodopera (€)</label>
          <input type="number" step="0.01" id="e-cake-labor" value="${cake.laborCost || 0}">
        </div>
        <div>
          <label>Energia (€)</label>
          <input type="number" step="0.01" id="e-cake-energy" value="${cake.energyCost || 0}">
        </div>
      </div>

      <label>Prezzo di Vendita (€)</label>
      <input type="number" step="0.01" id="e-cake-sale" value="${cake.salePrice || 0}" style="margin-bottom:25px; border-color:var(--accent);">

      <button class="btn btn-primary" onclick="App.updateCakeDetails(${id})">AGGIORNA CALCOLI</button>
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
  function formatCurrency(v) { return currencyFormatter.format(v || 0); }

  async function init() {
    registerServiceWorker();
    wireGlobalEvents();
    const ok = await initDB();
    if (ok) {
      await renderAll();
    }
  }

  return {
    init, openCakeDetail, openCakeModal, saveNewCake, openIngredientModal, saveIngredient, deleteCake, deleteIngredient, resetAllData, restoreIngredients, openEditCakeModal, updateCakeDetails
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
