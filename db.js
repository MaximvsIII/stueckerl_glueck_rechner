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

  function getAll(storeName, db) {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
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
      { name: 'Farina 00', category: 'Farine', unitType: 'g', packageQuantity: 1000, packagePrice: 1.8, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Zucchero', category: 'Zuccheri', unitType: 'g', packageQuantity: 1000, packagePrice: 1.5, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Burro', category: 'Latticini', unitType: 'g', packageQuantity: 250, packagePrice: 2.49, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Uova', category: 'Uova', unitType: 'piece', packageQuantity: 10, packagePrice: 3.49, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Cioccolato fondente', category: 'Cioccolato', unitType: 'g', packageQuantity: 200, packagePrice: 3.99, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
  }

  async function seedDemoData(db) {
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
