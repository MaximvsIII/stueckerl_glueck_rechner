/**
 * APP.JS - Versione di Ripristino e Stabilità
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

  // Gestione Service Worker con Cache Busting
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').then(reg => {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (confirm("Aggiornamento disponibile. Ricaricare ora?")) {
                  window.location.reload();
                }
              }
            });
          });
        });
      });
    }
  }

  // Binding Eventi Sicuro
  function wireGlobalEvents() {
    console.log("Wiring events...");

    // Navigazione Bottom Bar
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        switchView(btn.getAttribute('data-view'));
      };
    });

    // Pulsanti in pagina
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

  // Inizializzazione DB e Dati
  async function initDB() {
    try {
      state.db = await CakeDB.init();
      console.log("Database connesso correttamente.");

      // Seed dei settings se mancano
      const settings = await CakeDB.getAll('settings', state.db);
      if (settings.length === 0) {
        await CakeDB.addRecord('settings', state.db, {
          currency: 'EUR', laborHourlyRate: 15, energyCostPerKwh: 0.35, defaultMargin: 60,
          createdAt: new Date().toISOString()
        });
      }
      return true;
    } catch (err) {
      console.error("Errore inizializzazione DB:", err);
      return false;
    }
  }

  // --- RENDERING ---

  async function renderAll() {
    if (!state.db) return;
    console.log("Rendering views...");
    try {
      await Promise.all([renderHome(), renderIngredients(), renderCakes(), renderSettings()]);
    } catch (e) {
      console.error("Errore durante il rendering:", e);
    }
  }

  async function renderHome() {
    const list = document.getElementById('latest-cakes-list');
    if (!list) return;
    const cakes = await CakeDB.getAll('cakes', state.db);
    cakes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latest = cakes.slice(0, 5);

    list.innerHTML = latest.length ? latest.map(cake => `
      <div class="card" onclick="App.openCakeDetail(${cake.id})">
        <h4>${escapeHtml(cake.name)}</h4>
        <p>Costo: ${formatCurrency(cake.totalCost)}</p>
      </div>
    `).join('') : '<p style="padding:20px; text-align:center; color:var(--muted)">Nessuna torta salvata.</p>';
  }

  async function renderIngredients() {
    const list = document.getElementById('ingredients-list');
    if (!list) return;
    const items = await CakeDB.getAll('ingredients', state.db);
    list.innerHTML = items.map(ing => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4>${escapeHtml(ing.name)}</h4>
            <small>${formatCurrency(ing.packagePrice)} / ${ing.packageQuantity}${ing.unitType}</small>
          </div>
          <button class="btn btn-secondary" style="width:auto;" onclick="App.openIngredientModal(${ing.id})">Modifica</button>
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
        <h4>${escapeHtml(cake.name)}</h4>
        <p>Utile: ${formatCurrency(cake.profit)}</p>
      </div>
    `).join('');
  }

  async function renderSettings() {
    const cont = document.getElementById('settings-content');
    if (!cont) return;
    const s = (await CakeDB.getAll('settings', state.db))[0] || {};
    cont.innerHTML = `
      <div class="settings-box">
        <label>Valuta <input type="text" value="${s.currency || 'EUR'}" readonly></label>
        <button class="btn btn-danger" style="margin-top:20px" onclick="App.resetAllData()">ELIMINA TUTTI I DATI</button>
      </div>
    `;
  }

  // --- AZIONI ---

  async function openCakeDetail(id) {
    state.currentCakeId = id;
    const cake = await CakeDB.getById('cakes', state.db, id);
    if (!cake) return;

    const detail = document.getElementById('cake-detail-content');
    detail.innerHTML = `
      <div class="detail-panel">
        <h2>${escapeHtml(cake.name)}</h2>
        <div class="cost-line"><span>Costo Ingredienti</span> <span>${formatCurrency(cake.ingredientCost)}</span></div>
        <div class="cost-line"><span>Costo Totale</span> <span>${formatCurrency(cake.totalCost)}</span></div>
        <div class="cost-line"><span>Prezzo Vendita</span> <span>${formatCurrency(cake.salePrice)}</span></div>
        <div class="cost-line" style="border:none; margin-top:10px; font-weight:bold;"><span>UTILE</span> <span>${formatCurrency(cake.profit)}</span></div>

        <button class="btn btn-danger" style="margin-top:30px" onclick="App.deleteCake(${id})">Elimina Torta</button>
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
      <h3>Nuova Torta</h3>
      <input type="text" id="m-cake-name" placeholder="Nome della torta" style="margin-bottom:15px">
      <button class="btn btn-primary" onclick="App.saveNewCake()">SALVA</button>
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
      <h3>${id ? 'Modifica' : 'Nuovo'} Ingrediente</h3>
      <input type="text" id="m-ing-name" placeholder="Nome" value="${ing ? escapeHtml(ing.name) : ''}" style="margin-bottom:10px">
      <div style="display:flex; gap:10px; margin-bottom:10px;">
        <input type="number" id="m-ing-qty" placeholder="Q.tà" value="${ing ? ing.packageQuantity : ''}">
        <select id="m-ing-unit">
          <option value="g" ${ing?.unitType==='g'?'selected':''}>g</option>
          <option value="kg" ${ing?.unitType==='kg'?'selected':''}>kg</option>
          <option value="ml" ${ing?.unitType==='ml'?'selected':''}>ml</option>
          <option value="l" ${ing?.unitType==='l'?'selected':''}>l</option>
        </select>
      </div>
      <input type="number" id="m-ing-price" placeholder="Prezzo Confezione" value="${ing ? ing.packagePrice : ''}" style="margin-bottom:15px">
      <button class="btn btn-primary" onclick="App.saveIngredient(${id})">SALVA</button>
      ${id ? `<button class="btn btn-danger" style="margin-top:10px" onclick="App.deleteIngredient(${id})">ELIMINA</button>` : ''}
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
    if (confirm("Sei sicuro?")) {
      await CakeDB.deleteRecord('cakes', state.db, id);
      closeModal();
      switchView('cakes-view');
      await renderAll();
    }
  }

  async function deleteIngredient(id) {
    if (confirm("Eliminare l'ingrediente?")) {
      await CakeDB.deleteRecord('ingredients', state.db, id);
      closeModal();
      await renderIngredients();
    }
  }

  async function resetAllData() {
    if (confirm("CANCELLARE TUTTI I DATI? Questa azione non è reversibile.")) {
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => window.indexedDB.deleteDatabase(db.name));
      window.location.reload();
    }
  }

  function switchView(viewName) {
    console.log("Switching to:", viewName);
    state.activeView = viewName;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === viewName));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.getAttribute('data-view') === viewName));
    window.scrollTo(0,0);
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function formatCurrency(v) { return currencyFormatter.format(v || 0); }

  // Init finale
  async function init() {
    registerServiceWorker();
    wireGlobalEvents();
    const ok = await initDB();
    if (ok) {
      await renderAll();
    }
  }

  return {
    init, openCakeDetail, openCakeModal, saveNewCake, openIngredientModal, saveIngredient, deleteCake, deleteIngredient, resetAllData
  };
})();

// Lancio
document.addEventListener('DOMContentLoaded', () => App.init());
