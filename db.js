const CakeDB = (() => {
  const DB_NAME = 'CalcolatoreTorteDB';
  const DB_VERSION = 1;
  const STORE_NAMES = ['ingredients', 'cakes', 'cakeIngredients', 'recipes', 'settings'];

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        STORE_NAMES.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            if (storeName === 'cakeIngredients') {
              store.createIndex('cakeId', 'cakeId', { unique: false });
              store.createIndex('ingredientId', 'ingredientId', { unique: false });
            }
            if (storeName === 'ingredients') {
              store.createIndex('active', 'active', { unique: false });
            }
          }
        });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Errore apertura IndexedDB'));
    });
  }

  function transaction(db, storeNames, mode = 'readonly') {
    return db.transaction(storeNames, mode);
  }

  function getStore(db, storeName, mode = 'readonly') {
    return transaction(db, [storeName], mode).objectStore(storeName);
  }

  function normalizeIngredientKey(ingredient) {
    return [
      String(ingredient?.name || '').trim().toLowerCase(),
      String(ingredient?.category || '').trim().toLowerCase(),
      String(ingredient?.unitType || '').trim().toLowerCase(),
      String(ingredient?.packageQuantity ?? ''),
      String(ingredient?.packagePrice ?? '')
    ].join('::');
  }

  function dedupeIngredients(records) {
    const seen = new Set();
    return records.filter((record) => {
      const key = normalizeIngredientKey(record);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getAll(storeName, db) {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        const rows = request.result || [];
        resolve(storeName === 'ingredients' ? dedupeIngredients(rows) : rows);
      };
      request.onerror = () => reject(request.error || new Error(`Errore lettura ${storeName}`));
    });
  }

  function getById(storeName, db, id) {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error(`Errore lettura ${storeName} #${id}`));
    });
  }

  function putRecord(storeName, db, record) {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName, 'readwrite');
      const request = store.put(record);
      request.onsuccess = () => resolve(request.result || record.id);
      request.onerror = () => reject(request.error || new Error(`Errore salvataggio ${storeName}`));
    });
  }

  function addRecord(storeName, db, record) {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName, 'readwrite');
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(`Errore inserimento ${storeName}`));
    });
  }

  function deleteRecord(storeName, db, id) {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error || new Error(`Errore cancellazione ${storeName}`));
    });
  }

  function clearStore(storeName, db) {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName, 'readwrite');
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error || new Error(`Errore svuotamento ${storeName}`));
    });
  }

  function getAllByIndex(storeName, db, indexName, value) {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName, 'readonly');
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error(`Errore filtraggio ${storeName}`));
    });
  }

  function createSeedIngredients() {
    return [
      { name: 'Uova', category: 'Uova', unitType: 'piece', packageQuantity: 10, packagePrice: 2.79, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Farina', category: 'Farine', unitType: 'g', packageQuantity: 1000, packagePrice: 1.59, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Zucchero', category: 'Zuccheri', unitType: 'g', packageQuantity: 1000, packagePrice: 1.79, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Amido', category: 'Amidi', unitType: 'g', packageQuantity: 250, packagePrice: 2.29, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Cacao in polvere', category: 'Cioccolato', unitType: 'g', packageQuantity: 125, packagePrice: 5.49, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Lievito in polvere', category: 'Lieviti', unitType: 'g', packageQuantity: 150, packagePrice: 0.59, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Ciliegie amare', category: 'Frutta', unitType: 'g', packageQuantity: 360, packagePrice: 2.19, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Panna', category: 'Latticini', unitType: 'ml', packageQuantity: 250, packagePrice: 1.49, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Stabilizzante per panna', category: 'Additivi', unitType: 'g', packageQuantity: 3, packagePrice: 0.79, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Succo di ciliegia', category: 'Bevande', unitType: 'ml', packageQuantity: 1000, packagePrice: 3.00, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Scaglie di cioccolato', category: 'Cioccolato', unitType: 'g', packageQuantity: 100, packagePrice: 1.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Kiwi', category: 'Frutta', unitType: 'piece', packageQuantity: 1, packagePrice: 0.59, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Mirtilli', category: 'Frutta', unitType: 'g', packageQuantity: 300, packagePrice: 3.67, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Lamponi', category: 'Frutta', unitType: 'g', packageQuantity: 125, packagePrice: 3.00, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Fragole', category: 'Frutta', unitType: 'g', packageQuantity: 400, packagePrice: 3.49, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'More', category: 'Frutta', unitType: 'g', packageQuantity: 125, packagePrice: 3.29, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Uva', category: 'Frutta', unitType: 'g', packageQuantity: 500, packagePrice: 2.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Arancia', category: 'Frutta', unitType: 'g', packageQuantity: 1000, packagePrice: 2.47, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Copertura bianca', category: 'Cioccolato', unitType: 'g', packageQuantity: 200, packagePrice: 3.00, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Formaggio fresco Philadelphia', category: 'Latticini', unitType: 'g', packageQuantity: 175, packagePrice: 2.49, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Burro', category: 'Latticini', unitType: 'g', packageQuantity: 250, packagePrice: 2.79, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Yogurt', category: 'Latticini', unitType: 'g', packageQuantity: 250, packagePrice: 0.60, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Olio di colza', category: 'Oli', unitType: 'ml', packageQuantity: 1000, packagePrice: 1.80, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Latte', category: 'Latticini', unitType: 'ml', packageQuantity: 1000, packagePrice: 1.89, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Nutella', category: 'Dolci', unitType: 'g', packageQuantity: 450, packagePrice: 3.79, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Preparato per budino', category: 'Dolci', unitType: 'g', packageQuantity: 3, packagePrice: 1.19, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Latte al cioccolato', category: 'Bevande', unitType: 'ml', packageQuantity: 500, packagePrice: 0.79, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Mascarpone', category: 'Latticini', unitType: 'g', packageQuantity: 500, packagePrice: 4.39, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Glassa al cioccolato', category: 'Cioccolato', unitType: 'g', packageQuantity: 200, packagePrice: 4.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Noci', category: 'Frutta secca', unitType: 'g', packageQuantity: 200, packagePrice: 3.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Gocce di cioccolato', category: 'Cioccolato', unitType: 'g', packageQuantity: 100, packagePrice: 1.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Fondant', category: 'Decorazioni', unitType: 'g', packageQuantity: 1000, packagePrice: 12.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Fondant', category: 'Decorazioni', unitType: 'g', packageQuantity: 250, packagePrice: 3.80, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Scrittura di zucchero', category: 'Decorazioni', unitType: 'piece', packageQuantity: 1, packagePrice: 2.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Marmellata', category: 'Decorazioni', unitType: 'piece', packageQuantity: 1, packagePrice: 4.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Topper', category: 'Decorazioni', unitType: 'piece', packageQuantity: 1, packagePrice: 3.02, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Cakeboard', category: 'Imballaggio', unitType: 'piece', packageQuantity: 1, packagePrice: 20.00, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Scatola per torta', category: 'Imballaggio', unitType: 'piece', packageQuantity: 1, packagePrice: 20.00, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Zucchero a velo', category: 'Dolci', unitType: 'g', packageQuantity: 500, packagePrice: 1.29, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Latticello', category: 'Latticini', unitType: 'ml', packageQuantity: 500, packagePrice: 0.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Limoni bio', category: 'Frutta', unitType: 'g', packageQuantity: 500, packagePrice: 2.49, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Aroma limone', category: 'Aromi', unitType: 'g', packageQuantity: 4, packagePrice: 1.19, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Yogurt greco', category: 'Latticini', unitType: 'g', packageQuantity: 400, packagePrice: 1.61, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Bicarbonato', category: 'Lieviti', unitType: 'g', packageQuantity: 3, packagePrice: 0.84, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Zucchero vanigliato', category: 'Dolci', unitType: 'g', packageQuantity: 3, packagePrice: 1.29, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Albume', category: 'Uova', unitType: 'g', packageQuantity: 1000, packagePrice: 8.00, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Estratto di vaniglia', category: 'Aromi', unitType: 'ml', packageQuantity: 35, packagePrice: 3.19, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Ribes', category: 'Frutta', unitType: 'g', packageQuantity: 250, packagePrice: 2.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Frutti di bosco surgelati', category: 'Frutta', unitType: 'g', packageQuantity: 300, packagePrice: 4.79, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
  }

  async function cleanupDuplicateIngredients(db) {
    const store = getStore(db, 'ingredients');
    const rawIngredients = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Errore lettura ingredienti per pulizia'));
    });

    const seen = new Set();
    const duplicates = [];
    for (const ingredient of rawIngredients) {
      const key = normalizeIngredientKey(ingredient);
      if (seen.has(key)) {
        duplicates.push(ingredient);
      } else {
        seen.add(key);
      }
    }

    if (duplicates.length > 0) {
      await Promise.all(duplicates.map((ingredient) => deleteRecord('ingredients', db, ingredient.id)));
    }
  }

  async function seedDemoData(db) {
    await cleanupDuplicateIngredients(db);

    const ingredients = await getAll('ingredients', db);
    if (ingredients.length === 0) {
      const demoIngredients = createSeedIngredients();
      for (const item of demoIngredients) {
        item.unitCost = Number((item.packagePrice / item.packageQuantity).toFixed(10));
        await addRecord('ingredients', db, item);
      }
    }

    const settingsRows = await getAll('settings', db);
    if (settingsRows.length === 0) {
      await addRecord('settings', db, {
        currency: 'EUR',
        laborHourlyRate: 15,
        energyCostPerKwh: 0.35,
        defaultMargin: 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const cakes = await getAll('cakes', db);
    if (cakes.length > 0) return;

    const demoCake = {
      name: 'Torta al cioccolato',
      notes: 'Demo base',
      salePrice: 60,
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

    const cakeId = await addRecord('cakes', db, demoCake);
    const allIngredients = await getAll('ingredients', db);
    const ingredientIndex = Object.fromEntries(allIngredients.map((ing) => [ing.name, ing]));
    const mapping = [
      ['Farina 00', 500],
      ['Zucchero', 200],
      ['Burro', 150],
      ['Uova', 4]
    ];

    for (const [name, qty] of mapping) {
      const ingredient = ingredientIndex[name];
      await addRecord('cakeIngredients', db, {
        cakeId,
        ingredientId: ingredient.id,
        quantityUsed: qty,
        unit: ingredient.unitType,
        unitCost: ingredient.unitCost,
        usedCost: qty * ingredient.unitCost,
        createdAt: new Date().toISOString()
      });
    }

    const cake = await getById('cakes', db, cakeId);
    await syncCakeTotals(db, cakeId, cake);
  }

  async function syncCakeTotals(db, cakeId, cakeRecord) {
    const rows = await getAllByIndex('cakeIngredients', db, 'cakeId', cakeId);
    const ingredientCost = rows.reduce((sum, row) => sum + Number(row.usedCost || 0), 0);
    const totalCost = ingredientCost
      + Number(cakeRecord.decorationCost || 0)
      + Number(cakeRecord.packagingCost || 0)
      + Number(cakeRecord.energyCost || 0)
      + Number(cakeRecord.laborCost || 0);
    const salePrice = Number(cakeRecord.salePrice || 0);
    const profit = salePrice - totalCost;
    const marginPercent = salePrice > 0 ? (profit / salePrice) * 100 : 0;

    const updatedCake = {
      ...cakeRecord,
      ingredientCost,
      totalCost,
      profit,
      marginPercent,
      updatedAt: new Date().toISOString()
    };

    await putRecord('cakes', db, updatedCake);
    return updatedCake;
  }

  async function init() {
    const db = await openDatabase();
    await seedDemoData(db);
    return db;
  }

  return {
    DB_NAME,
    DB_VERSION,
    openDatabase,
    init,
    getAll,
    cleanupDuplicateIngredients,
    getById,
    getAllByIndex,
    putRecord,
    addRecord,
    deleteRecord,
    clearStore,
    seedDemoData,
    syncCakeTotals,
    createSeedIngredients,
    transaction,
    getStore
  };
})();
