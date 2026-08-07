const App = (() => {
  const state = {
    db: null,
    activeView: 'home-view',
    editingIngredientId: null,
    currentCakeId: null
  };

  const currencyFormatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  });

  function init() {
    registerServiceWorker();
    wireGlobalEvents();

    CakeDB.init().then(async (db) => {
      state.db = db;
      await ensureDefaultSettings();
      await renderAll();
    }).catch((error) => {
      alert('Errore nel caricamento del database locale: ' + error.message);
    });
  }

  function wireGlobalEvents() {
    document.querySelectorAll('.nav-item').forEach((button) => {
      button.addEventListener('click', () => switchView(button.dataset.view));
    });

    document.getElementById('new-cake-home').addEventListener('click', () => openCakeModal());
    document.getElementById('new-cake-cakes').addEventListener('click', () => openCakeModal());
    document.getElementById('new-ingredient-btn').addEventListener('click', () => openIngredientModal());
    document.getElementById('back-to-cakes').addEventListener('click', () => switchView('cakes-view'));
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (event) => {
      if (event.target.id === 'modal') closeModal();
    });
  }

  async function ensureDefaultSettings() {
    const rows = await CakeDB.getAll('settings', state.db);
    if (rows.length > 0) return;
    await CakeDB.addRecord('settings', state.db, {
      currency: 'EUR',
      laborHourlyRate: 15,
      energyCostPerKwh: 0.35,
      defaultMargin: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async function renderAll() {
    await renderHome();
    await renderIngredients();
    await renderCakes();
    await renderSettings();
    if (state.currentCakeId) {
      await openCakeDetail(state.currentCakeId);
    }
  }

  async function renderHome() {
    const cakes = await CakeDB.getAll('cakes', state.db);
    cakes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latest = cakes.slice(0, 5);
    const list = document.getElementById('latest-cakes-list');
    list.innerHTML = latest.map((cake) => `
      <article class="card" data-cake-id="${cake.id}">
        <h4>${escapeHtml(cake.name || 'Senza nome')}</h4>
        <p>Costo: <span class="amount">${formatCurrency(cake.totalCost || 0)}</span></p>
        <p>Vendita: <span class="amount">${formatCurrency(cake.salePrice || 0)}</span></p>
        <p>Utile: <span class="amount">${formatCurrency(cake.profit || 0)}</span></p>
        <p>Margine: <span class="amount">${formatPercent(cake.marginPercent || 0)}</span></p>
      </article>`).join('');

    list.querySelectorAll('[data-cake-id]').forEach((card) => {
      card.addEventListener('click', () => openCakeDetail(Number(card.dataset.cakeId)));
    });
  }

  async function renderIngredients() {
    const ingredients = await CakeDB.getAll('ingredients', state.db);
    ingredients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const list = document.getElementById('ingredients-list');
    list.innerHTML = ingredients.map((ingredient) => `
      <article class="card">
        <h4>${escapeHtml(ingredient.name)}</h4>
        <p>${escapeHtml(ingredient.category || '')}</p>
        <div class="meta">
          <span class="badge">${escapeHtml(formatPackageLabel(ingredient))}</span>
          <span class="badge">${formatCurrency(ingredient.packagePrice || 0)}</span>
          <span class="badge">${formatUnitCost(ingredient.unitCost || 0, ingredient.unitType)}</span>
        </div>
        <div class="flex-actions" style="margin-top:12px;">
          <button class="btn btn-secondary" data-action="toggle" data-id="${ingredient.id}">${ingredient.active === false ? 'Attiva' : 'Disattiva'}</button>
          <button class="btn btn-secondary" data-action="edit" data-id="${ingredient.id}">Modifica</button>
          <button class="btn btn-danger" data-action="delete" data-id="${ingredient.id}">Elimina</button>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('[data-action="toggle"]').forEach((button) => {
      button.addEventListener('click', () => toggleIngredientActive(Number(button.dataset.id)));
    });
    list.querySelectorAll('[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', () => openIngredientModal(Number(button.dataset.id)));
    });
    list.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', () => deleteIngredient(Number(button.dataset.id)));
    });
  }

  async function renderCakes() {
    const cakes = await CakeDB.getAll('cakes', state.db);
    cakes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const list = document.getElementById('cakes-list');
    list.innerHTML = cakes.map((cake) => `
      <article class="card cake-card" data-cake-id="${cake.id}">
        <button
          class="cake-delete-btn"
          data-delete-cake="${cake.id}"
          aria-label="Elimina torta"
          type="button"
          style="position:absolute;top:10px;right:10px;width:32px;height:32px;border:none;border-radius:50%;background:#E14A4A;color:#fff;font-size:1.15rem;line-height:1;font-weight:800;cursor:pointer;display:grid;place-items:center;box-shadow:0 6px 14px rgba(225,74,74,0.35);"
        >×</button>
        <h4>${escapeHtml(cake.name || 'Senza nome')}</h4>
        <p>Totale: <span class="amount">${formatCurrency(cake.totalCost || 0)}</span></p>
        <p>Vendita: <span class="amount">${formatCurrency(cake.salePrice || 0)}</span></p>
        <p>Utile: <span class="amount">${formatCurrency(cake.profit || 0)}</span></p>
        <p>Margine: <span class="amount">${formatPercent(cake.marginPercent || 0)}</span></p>
      </article>`).join('');

    list.querySelectorAll('[data-cake-id]').forEach((card) => {
      card.addEventListener('click', () => openCakeDetail(Number(card.dataset.cakeId)));
    });
    list.querySelectorAll('[data-delete-cake]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        await deleteCake(Number(button.dataset.deleteCake));
      });
    });
  }

  async function renderSettings() {
    const rows = await CakeDB.getAll('settings', state.db);
    const settings = rows[0] || { currency: 'EUR', laborHourlyRate: 15, energyCostPerKwh: 0.35, defaultMargin: 60 };
    const container = document.getElementById('settings-content');
    container.innerHTML = `
      <div class="settings-box">
        <div class="form-grid">
          <label>Valuta
            <input id="setting-currency" value="${escapeHtml(settings.currency || 'EUR')}" />
          </label>
          <label>Tariffa oraria manodopera
            <input id="setting-labor" type="number" min="0" step="0.01" value="${settings.laborHourlyRate || 0}" />
          </label>
          <label>Costo energia per kWh
            <input id="setting-energy" type="number" min="0" step="0.01" value="${settings.energyCostPerKwh || 0}" />
          </label>
          <label>Margine predefinito
            <input id="setting-margin" type="number" min="0" max="100" step="0.01" value="${settings.defaultMargin || 0}" />
          </label>
          <div class="flex-actions">
            <button class="btn btn-primary" id="save-settings">Salva impostazioni</button>
          </div>
          <div class="flex-actions">
            <button class="btn btn-secondary" id="export-backup">ESPORTA BACKUP</button>
            <label class="btn btn-secondary" for="import-backup-file">IMPORTA BACKUP</label>
            <input id="import-backup-file" type="file" accept="application/json" hidden>
          </div>
          <div class="flex-actions">
            <button class="btn btn-danger" id="reset-all-data">Elimina tutti i dati</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('export-backup').addEventListener('click', exportBackup);
    document.getElementById('import-backup-file').addEventListener('change', importBackup);
    document.getElementById('reset-all-data').addEventListener('click', resetAllData);
  }

  async function openCakeDetail(cakeId) {
    state.currentCakeId = cakeId;
    switchView('cake-detail-view');
    const cake = await CakeDB.getById('cakes', state.db, cakeId);
    const rows = await CakeDB.getAllByIndex('cakeIngredients', state.db, 'cakeId', cakeId);
    const ingredientsById = Object.fromEntries((await CakeDB.getAll('ingredients', state.db)).map((item) => [item.id, item]));

    const detail = document.getElementById('cake-detail-content');
    detail.innerHTML = `
      <div class="detail-panel">
        <div class="form-grid">
          <label>Nome torta
            <input id="cake-name" value="${escapeHtml(cake.name || '')}" />
          </label>
          <label>Note
            <textarea id="cake-notes">${escapeHtml(cake.notes || '')}</textarea>
          </label>
          <label>Prezzo vendita
            <input id="cake-sale-price" type="number" min="0" step="0.01" value="${Number(cake.salePrice || 0).toFixed(2)}" />
          </label>
          <div class="flex-actions">
            <button class="btn btn-primary" id="save-cake-basic">Salva dettagli</button>
            <button class="btn btn-secondary" id="add-ingredient-to-cake">+ AGGIUNGI INGREDIENTE</button>
          </div>
        </div>

        <div class="section-block" style="margin-top:14px; padding:14px;">
          <h3>Ingredienti</h3>
          <div class="inline-list">
            ${rows.map((row) => {
              const ingredient = ingredientsById[row.ingredientId];
              return `
                <div class="inline-item">
                  <div>
                    <strong>${escapeHtml(ingredient?.name || 'Ingrediente')}</strong><br>
                    <small>${row.quantityUsed} ${row.unit}</small>
                  </div>
                  <div>
                    <div class="amount">${formatCurrency(row.usedCost || 0)}</div>
                    <div class="flex-actions" style="margin-top:6px;">
                      <button class="btn btn-secondary" data-delete-row="${row.id}">Rimuovi</button>
                    </div>
                  </div>
                </div>`;
            }).join('')}
          </div>
          <div class="cost-line"><span>Costo ingredienti</span><span class="value-pill">${formatCurrency(cake.ingredientCost || 0)}</span></div>
          <div class="cost-line"><span>Decorazioni</span><span class="value-pill"><input type="text" inputmode="decimal" pattern="[0-9]*([.,][0-9]+)?" class="numeric-input" data-cost-field="decorationCost" value="${Number(cake.decorationCost || 0).toFixed(2)}" /></span></div>
          <div class="cost-line"><span>Packaging</span><span class="value-pill"><input type="text" inputmode="decimal" pattern="[0-9]*([.,][0-9]+)?" class="numeric-input" data-cost-field="packagingCost" value="${Number(cake.packagingCost || 0).toFixed(2)}" /></span></div>
          <div class="cost-line"><span>Energia</span><span class="value-pill"><input type="text" inputmode="decimal" pattern="[0-9]*([.,][0-9]+)?" class="numeric-input" data-cost-field="energyCost" value="${Number(cake.energyCost || 0).toFixed(2)}" /></span></div>
          <div class="cost-line"><span>Manodopera</span><span class="value-pill"><input type="text" inputmode="decimal" pattern="[0-9]*([.,][0-9]+)?" class="numeric-input" data-cost-field="laborCost" value="${Number(cake.laborCost || 0).toFixed(2)}" /></span></div>
          <div class="cost-line"><span>Costo totale</span><span class="value-pill">${formatCurrency(cake.totalCost || 0)}</span></div>
          <div class="cost-line"><span>Utile</span><span class="value-pill">${formatCurrency(cake.profit || 0)}</span></div>
          <div class="cost-line"><span>Margine</span><span class="value-pill">${formatPercent(cake.marginPercent || 0)}</span></div>
        </div>
      </div>
    `;

    document.getElementById('save-cake-basic').addEventListener('click', saveCakeBasic);
    document.getElementById('add-ingredient-to-cake').addEventListener('click', () => openCakeIngredientModal(cakeId));

    // Improved handlers: don't update DB on every keystroke (avoids losing focus).
    detail.querySelectorAll('[data-cost-field]').forEach((input) => {
      // select all on focus for easy overwrite
      input.addEventListener('focus', () => setTimeout(() => input.select(), 0));

      // sanitize input as user types: allow digits and one decimal separator
      input.addEventListener('input', () => {
        let v = input.value.replace(',', '.');
        // remove all non-digit/decimal chars
        v = v.replace(/[^0-9.]/g, '');
        const parts = v.split('.');
        if (parts.length > 2) {
          v = parts.shift() + '.' + parts.join('');
        }
        input.value = v;
      });

      // allow Enter to commit
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          input.blur();
        }
      });

      // on blur, parse, persist and refresh totals
      input.addEventListener('blur', async () => {
        const field = input.dataset.costField;
        const raw = (input.value || '').replace(',', '.');
        const parsed = Number(parseFloat(raw) || 0);
        input.value = parsed.toFixed(2);
        try {
          const cake = await CakeDB.getById('cakes', state.db, cakeId);
          cake[field] = parsed;
          await CakeDB.putRecord('cakes', state.db, cake);
          await CakeDB.syncCakeTotals(state.db, cakeId, cake);
          await renderAll();
        } catch (err) {
          console.error('Errore salvataggio costo:', err);
        }
      });
    });

    detail.querySelectorAll('[data-delete-row]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!confirm('Rimuovere questo ingrediente dalla torta?')) return;
        await CakeDB.deleteRecord('cakeIngredients', state.db, Number(button.dataset.deleteRow));
        const cake = await CakeDB.getById('cakes', state.db, cakeId);
        await CakeDB.syncCakeTotals(state.db, cakeId, cake);
        await renderAll();
      });
    });
  }

  async function saveCakeBasic() {
    const cakeId = state.currentCakeId;
    const cake = await CakeDB.getById('cakes', state.db, cakeId);
    cake.name = document.getElementById('cake-name').value.trim();
    cake.notes = document.getElementById('cake-notes').value.trim();
    cake.salePrice = Number(document.getElementById('cake-sale-price').value || 0);

    await CakeDB.putRecord('cakes', state.db, cake);
    await CakeDB.syncCakeTotals(state.db, cakeId, cake);

    state.currentCakeId = null;
    switchView('cakes-view');
    await renderAll();
  }

  async function openIngredientModal(id = null) {
    state.editingIngredientId = id;
    const ingredient = id ? await CakeDB.getById('ingredients', state.db, id) : null;
    const html = `
      <h3>${id ? 'Modifica ingrediente' : 'Nuovo ingrediente'}</h3>
      <div class="form-grid">
        <label>Nome
          <input id="ingredient-name" value="${escapeHtml(ingredient?.name || '')}" required />
        </label>
        <label>Categoria
          <input id="ingredient-category" value="${escapeHtml(ingredient?.category || '')}" required />
        </label>
        <label>Unità
          <select id="ingredient-unitType">
            ${['g', 'kg', 'ml', 'l', 'piece'].map((unit) => `<option value="${unit}" ${unit === (ingredient?.unitType || 'g') ? 'selected' : ''}>${unit}</option>`).join('')}
          </select>
        </label>
        <label>Quantità confezione
          <input id="ingredient-packageQuantity" type="number" min="0.000001" step="0.000001" value="${Number(ingredient?.packageQuantity || 0).toFixed(6)}" required />
        </label>
        <label>Prezzo confezione
          <input id="ingredient-packagePrice" type="number" min="0" step="0.01" value="${Number(ingredient?.packagePrice || 0).toFixed(2)}" required />
        </label>
        <div class="helper" id="unit-cost-preview">Costo unitario: ${formatUnitCost(ingredient?.unitCost || 0, ingredient?.unitType || 'g')}</div>
        <div class="flex-actions">
          <button class="btn btn-primary" id="submit-ingredient">Salva</button>
        </div>
      </div>
    `;
    openModal(html);

    const inputQuantity = document.getElementById('ingredient-packageQuantity');
    const inputPrice = document.getElementById('ingredient-packagePrice');
    const inputUnit = document.getElementById('ingredient-unitType');
    const preview = document.getElementById('unit-cost-preview');

    const updatePreview = () => {
      const unitType = inputUnit.value;
      const quantity = Number(inputQuantity.value || 0);
      const price = Number(inputPrice.value || 0);
      const unitCost = quantity > 0 ? price / quantity : 0;
      preview.textContent = `Costo unitario: ${formatUnitCost(unitCost, unitType)}`;
    };

    inputQuantity.addEventListener('input', updatePreview);
    inputPrice.addEventListener('input', updatePreview);
    inputUnit.addEventListener('change', updatePreview);

    document.getElementById('submit-ingredient').addEventListener('click', saveIngredientForm);
  }

  async function saveIngredientForm() {
    try {
      if (!state.db) {
        state.db = await CakeDB.init();
      }

      const name = document.getElementById('ingredient-name').value.trim();
      const category = document.getElementById('ingredient-category').value.trim();
      const unitType = document.getElementById('ingredient-unitType').value;
      const packageQuantity = Number(document.getElementById('ingredient-packageQuantity').value);
      const packagePrice = Number(document.getElementById('ingredient-packagePrice').value);

      if (!name) return showError('Nome ingrediente obbligatorio.');
      if (!category) return showError('Categoria obbligatoria.');
      if (!(packageQuantity > 0)) return showError('Quantità confezione > 0.');
      if (!(packagePrice >= 0)) return showError('Prezzo confezione >= 0.');

      const unitCost = packagePrice / packageQuantity;
      const isEditing = Boolean(state.editingIngredientId);
      const record = isEditing ? await CakeDB.getById('ingredients', state.db, state.editingIngredientId) : {};
      const nextRecord = {
        ...record,
        name,
        category,
        unitType,
        packageQuantity,
        packagePrice,
        unitCost,
        active: record.active ?? true,
        updatedAt: new Date().toISOString(),
        createdAt: record.createdAt || new Date().toISOString()
      };

      if (isEditing) {
        await CakeDB.putRecord('ingredients', state.db, nextRecord);
        console.debug('Ingrediente aggiornato:', nextRecord);
      } else {
        await CakeDB.addRecord('ingredients', state.db, nextRecord);
        console.debug('Ingrediente salvato:', nextRecord);
      }

      state.editingIngredientId = null;
      closeModal();
      await renderIngredients();
      await renderCakes();
    } catch (error) {
      console.error('Errore salvataggio ingrediente:', error);
      showError('Errore salvataggio ingrediente: ' + (error.message || error));
    }
  }

  async function toggleIngredientActive(id) {
    const ingredient = await CakeDB.getById('ingredients', state.db, id);
    ingredient.active = ingredient.active === false ? true : false;
    ingredient.updatedAt = new Date().toISOString();
    await CakeDB.putRecord('ingredients', state.db, ingredient);
    await renderIngredients();
  }

  async function deleteIngredient(id) {
    const ingredient = await CakeDB.getById('ingredients', state.db, id);
    const used = await CakeDB.getAllByIndex('cakeIngredients', state.db, 'ingredientId', id);
    if (used.length > 0) {
      if (!confirm('L\'ingrediente è stato usato in alcune torte. Preferibilmente lo imposterò come inattivo invece di cancellarlo definitivamente. Continuare?')) return;
      ingredient.active = false;
      ingredient.updatedAt = new Date().toISOString();
      await CakeDB.putRecord('ingredients', state.db, ingredient);
      await renderIngredients();
      return;
    }

    if (!confirm('Eliminare definitivamente questo ingrediente?')) return;
    await CakeDB.deleteRecord('ingredients', state.db, id);
    await renderIngredients();
  }

  async function deleteCake(id) {
    if (!confirm('Eliminare definitivamente questa torta?')) return;

    const cakeRows = await CakeDB.getAllByIndex('cakeIngredients', state.db, 'cakeId', id);
    await Promise.all(cakeRows.map((row) => CakeDB.deleteRecord('cakeIngredients', state.db, row.id)));
    await CakeDB.deleteRecord('cakes', state.db, id);

    if (state.currentCakeId === id) {
      state.currentCakeId = null;
    }

    await renderAll();
  }

  async function openCakeModal() {
    const html = `
      <h3>Nuova torta</h3>
      <div class="form-grid">
        <label>Nome torta
          <input id="cake-name" required />
        </label>
        <label>Note
          <textarea id="cake-notes"></textarea>
        </label>
        <label>Prezzo vendita
          <input id="cake-sale-price" type="number" min="0" step="0.01" value="0" />
        </label>
        <div class="flex-actions">
          <button class="btn btn-primary" id="create-cake">Crea torta</button>
        </div>
      </div>
    `;
    openModal(html);
    document.getElementById('create-cake').addEventListener('click', createCake);
  }

  async function createCake() {
    const name = document.getElementById('cake-name').value.trim();
    const notes = document.getElementById('cake-notes').value.trim();
    const salePrice = Number(document.getElementById('cake-sale-price').value || 0);
    if (!name) return showError('Nome torta obbligatorio.');
    if (!(salePrice >= 0)) return showError('Prezzo vendita >= 0.');

    const cake = {
      name,
      notes,
      salePrice,
      decorationCost: 0,
      packagingCost: 0,
      energyCost: 0,
      laborCost: 0,
      ingredientCost: 0,
      totalCost: 0,
      profit: 0,
      marginPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const id = await CakeDB.addRecord('cakes', state.db, cake);
    closeModal();
    await renderAll();
    await openCakeDetail(id);
  }

  async function openCakeIngredientModal(cakeId) {
    const ingredients = await CakeDB.getAll('ingredients', state.db);
    const activeIngredients = ingredients.filter((item) => item.active !== false);
    const html = `
      <h3>Aggiungi ingrediente alla torta</h3>
      <div class="form-grid">
        <label>Ingrediente
          <select id="ingredient-selector">
            <option value="">Seleziona</option>
            ${activeIngredients.map((item) => `<option value="${item.id}">${escapeHtml(item.name)} (${item.unitType})</option>`).join('')}
          </select>
        </label>
        <div id="ingredient-preview"></div>
        <label>Quantità utilizzata
          <input id="quantity-used" type="number" min="0.000001" step="0.000001" value="0" />
        </label>
        <div class="flex-actions">
          <button class="btn btn-primary" id="save-cake-ingredient">Salva</button>
        </div>
      </div>
    `;
    openModal(html);
    const selector = document.getElementById('ingredient-selector');
    const preview = document.getElementById('ingredient-preview');
    const quantity = document.getElementById('quantity-used');

    selector.addEventListener('change', async () => {
      const ingredient = await CakeDB.getById('ingredients', state.db, Number(selector.value));
      preview.innerHTML = `
        <div class="card">
          <h4>${escapeHtml(ingredient.name)}</h4>
          <p>Unità: ${ingredient.unitType}</p>
          <p>Costo unitario: ${formatUnitCost(ingredient.unitCost || 0, ingredient.unitType)}</p>
        </div>
      `;
    });

    document.getElementById('save-cake-ingredient').addEventListener('click', async () => {
      const ingredientId = Number(selector.value);
      const ingredient = await CakeDB.getById('ingredients', state.db, ingredientId);
      const qty = Number(quantity.value || 0);
      if (!ingredientId) return showError('Selezionare un ingrediente.');
      if (!(qty > 0)) return showError('Quantità utilizzata > 0.');
      if (!ingredient) return showError('Ingrediente non trovato.');
      const usedCost = qty * Number(ingredient.unitCost || 0);
      await CakeDB.addRecord('cakeIngredients', state.db, {
        cakeId,
        ingredientId: ingredient.id,
        quantityUsed: qty,
        unit: ingredient.unitType,
        unitCost: ingredient.unitCost,
        usedCost,
        createdAt: new Date().toISOString()
      });
      const cake = await CakeDB.getById('cakes', state.db, cakeId);
      await CakeDB.syncCakeTotals(state.db, cakeId, cake);
      closeModal();
      await renderAll();
    });
  }

  async function saveSettings() {
    const rows = await CakeDB.getAll('settings', state.db);
    const settings = rows[0] || {};
    settings.currency = document.getElementById('setting-currency').value || 'EUR';
    settings.laborHourlyRate = Number(document.getElementById('setting-labor').value || 0);
    settings.energyCostPerKwh = Number(document.getElementById('setting-energy').value || 0);
    settings.defaultMargin = Number(document.getElementById('setting-margin').value || 0);
    settings.updatedAt = new Date().toISOString();
    if (!settings.createdAt) settings.createdAt = new Date().toISOString();
    await CakeDB.putRecord('settings', state.db, settings);
    alert('Impostazioni salvate.');
  }

  async function exportBackup() {
    const allData = {
      ingredients: await CakeDB.getAll('ingredients', state.db),
      cakes: await CakeDB.getAll('cakes', state.db),
      cakeIngredients: await CakeDB.getAll('cakeIngredients', state.db),
      recipes: await CakeDB.getAll('recipes', state.db),
      settings: await CakeDB.getAll('settings', state.db)
    };

    const now = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `calcolatore-torte-backup-${now}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm('Sovrascrivere tutti i dati locali con il backup selezionato?')) return;

    const text = await file.text();
    const payload = JSON.parse(text);
    const db = state.db;

    await Promise.all([
      CakeDB.clearStore('ingredients', db),
      CakeDB.clearStore('cakes', db),
      CakeDB.clearStore('cakeIngredients', db),
      CakeDB.clearStore('recipes', db),
      CakeDB.clearStore('settings', db)
    ]);

    for (const storeName of ['ingredients', 'cakes', 'cakeIngredients', 'recipes', 'settings']) {
      for (const item of payload[storeName] || []) {
        await CakeDB.putRecord(storeName, db, item);
      }
    }

    await renderAll();
    alert('Backup importato correttamente.');
  }

  async function resetAllData() {
    const firstConfirm = confirm('Sei sicuro di voler eliminare tutti i dati locali?');
    if (!firstConfirm) return;
    const secondConfirm = confirm('Seconda conferma: vuoi davvero cancellare tutto?');
    if (!secondConfirm) return;
    await Promise.all([
      CakeDB.clearStore('ingredients', state.db),
      CakeDB.clearStore('cakes', state.db),
      CakeDB.clearStore('cakeIngredients', state.db),
      CakeDB.clearStore('recipes', state.db),
      CakeDB.clearStore('settings', state.db)
    ]);
    await CakeDB.seedDemoData(state.db);
    await renderAll();
    alert('Tutti i dati sono stati eliminati.');
  }

  function switchView(viewName) {
    state.activeView = viewName;
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
    document.getElementById(viewName).classList.add('active');
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === viewName));
  }

  function openModal(content) {
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal').classList.add('hidden');
  }

  function showError(message) {
    alert(message);
  }

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatCurrency(value) {
    return currencyFormatter.format(Number(value || 0));
  }

  function formatPercent(value) {
    return `${Number(value || 0).toFixed(1)}%`;
  }

  function formatPackageLabel(ingredient) {
    return `${ingredient.packageQuantity || 0} ${ingredient.unitType || ''}`;
  }

  function formatUnitCost(unitCost, unitType) {
    const safe = Number(unitCost || 0);
    return `${formatCurrency(safe)}/${unitType}`;
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('./service-worker.js');
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        } catch (error) {
          console.warn('Service worker non registrato:', error);
        }
      });
    }
  }

  const exported = { init };
  window.App = exported;
  return exported;
})();

window.addEventListener('DOMContentLoaded', () => App.init());
