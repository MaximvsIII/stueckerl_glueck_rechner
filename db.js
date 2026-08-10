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

  function getStore(db, storeName, mode = 'readonly') {
    return db.transaction([storeName], mode).objectStore(storeName);
  }

  function createSeedIngredients() {
    return [
      { name: 'Uova', category: 'Uova', unitType: 'piece', packageQuantity: 10, packagePrice: 2.79, active: true },
      { name: 'Farina', category: 'Farine', unitType: 'g', packageQuantity: 1000, packagePrice: 1.59, active: true },
      { name: 'Zucchero', category: 'Zuccheri', unitType: 'g', packageQuantity: 1000, packagePrice: 1.79, active: true },
      { name: 'Amido', category: 'Amidi', unitType: 'g', packageQuantity: 250, packagePrice: 2.29, active: true },
      { name: 'Cacao in polvere', category: 'Cioccolato', unitType: 'g', packageQuantity: 125, packagePrice: 5.49, active: true },
      { name: 'Lievito in polvere', category: 'Lieviti', unitType: 'g', packageQuantity: 150, packagePrice: 0.59, active: true },
      { name: 'Ciliegie amare', category: 'Frutta', unitType: 'g', packageQuantity: 360, packagePrice: 2.19, active: true },
      { name: 'Panna', category: 'Latticini', unitType: 'ml', packageQuantity: 250, packagePrice: 1.49, active: true },
      { name: 'Stabilizzante per panna', category: 'Additivi', unitType: 'g', packageQuantity: 3, packagePrice: 0.79, active: true },
      { name: 'Succo di ciliegia', category: 'Bevande', unitType: 'ml', packageQuantity: 1000, packagePrice: 3.00, active: true },
      { name: 'Scaglie di cioccolato', category: 'Cioccolato', unitType: 'g', packageQuantity: 100, packagePrice: 1.99, active: true },
      { name: 'Kiwi', category: 'Frutta', unitType: 'piece', packageQuantity: 1, packagePrice: 0.59, active: true },
      { name: 'Mirtilli', category: 'Frutta', unitType: 'g', packageQuantity: 300, packagePrice: 3.67, active: true },
      { name: 'Lamponi', category: 'Frutta', unitType: 'g', packageQuantity: 125, packagePrice: 3.00, active: true },
      { name: 'Fragole', category: 'Frutta', unitType: 'g', packageQuantity: 400, packagePrice: 3.49, active: true },
      { name: 'More', category: 'Frutta', unitType: 'g', packageQuantity: 125, packagePrice: 3.29, active: true },
      { name: 'Uva', category: 'Frutta', unitType: 'g', packageQuantity: 500, packagePrice: 2.99, active: true },
      { name: 'Arancia', category: 'Frutta', unitType: 'g', packageQuantity: 1000, packagePrice: 2.47, active: true },
      { name: 'Copertura bianca', category: 'Cioccolato', unitType: 'g', packageQuantity: 200, packagePrice: 3.00, active: true },
      { name: 'Formaggio Philadelphia', category: 'Latticini', unitType: 'g', packageQuantity: 175, packagePrice: 2.49, active: true },
      { name: 'Burro', category: 'Latticini', unitType: 'g', packageQuantity: 250, packagePrice: 2.79, active: true },
      { name: 'Yogurt', category: 'Latticini', unitType: 'g', packageQuantity: 250, packagePrice: 0.60, active: true },
      { name: 'Olio di colza', category: 'Oli', unitType: 'ml', packageQuantity: 1000, packagePrice: 1.80, active: true },
      { name: 'Latte', category: 'Latticini', unitType: 'ml', packageQuantity: 1000, packagePrice: 1.89, active: true },
      { name: 'Nutella', category: 'Dolci', unitType: 'g', packageQuantity: 450, packagePrice: 3.79, active: true },
      { name: 'Preparato budino', category: 'Dolci', unitType: 'g', packageQuantity: 3, packagePrice: 1.19, active: true },
      { name: 'Latte al cioccolato', category: 'Bevande', unitType: 'ml', packageQuantity: 500, packagePrice: 0.79, active: true },
      { name: 'Mascarpone', category: 'Latticini', unitType: 'g', packageQuantity: 500, packagePrice: 4.39, active: true },
      { name: 'Glassa al cioccolato', category: 'Cioccolato', unitType: 'g', packageQuantity: 200, packagePrice: 4.99, active: true },
      { name: 'Noci', category: 'Frutta secca', unitType: 'g', packageQuantity: 200, packagePrice: 3.99, active: true },
      { name: 'Gocce di cioccolato', category: 'Cioccolato', unitType: 'g', packageQuantity: 100, packagePrice: 1.99, active: true },
      { name: 'Fondant', category: 'Decorazioni', unitType: 'g', packageQuantity: 1000, packagePrice: 12.99, active: true },
      { name: 'Scrittura zucchero', category: 'Decorazioni', unitType: 'piece', packageQuantity: 1, packagePrice: 2.99, active: true },
      { name: 'Marmellata', category: 'Decorazioni', unitType: 'piece', packageQuantity: 1, packagePrice: 4.99, active: true },
      { name: 'Topper', category: 'Decorazioni', unitType: 'piece', packageQuantity: 1, packagePrice: 3.02, active: true },
      { name: 'Cakeboard', category: 'Imballaggio', unitType: 'piece', packageQuantity: 1, packagePrice: 20.00, active: true },
      { name: 'Scatola torta', category: 'Imballaggio', unitType: 'piece', packageQuantity: 1, packagePrice: 20.00, active: true },
      { name: 'Zucchero a velo', category: 'Dolci', unitType: 'g', packageQuantity: 500, packagePrice: 1.29, active: true },
      { name: 'Latticello', category: 'Latticini', unitType: 'ml', packageQuantity: 500, packagePrice: 0.99, active: true },
      { name: 'Limoni bio', category: 'Frutta', unitType: 'g', packageQuantity: 500, packagePrice: 2.49, active: true },
      { name: 'Aroma limone', category: 'Aromi', unitType: 'g', packageQuantity: 4, packagePrice: 1.19, active: true },
      { name: 'Yogurt greco', category: 'Latticini', unitType: 'g', packageQuantity: 400, packagePrice: 1.61, active: true },
      { name: 'Bicarbonato', category: 'Lieviti', unitType: 'g', packageQuantity: 3, packagePrice: 0.84, active: true },
      { name: 'Zucchero vanigliato', category: 'Dolci', unitType: 'g', packageQuantity: 3, packagePrice: 1.29, active: true },
      { name: 'Albume', category: 'Uova', unitType: 'g', packageQuantity: 1000, packagePrice: 8.00, active: true },
      { name: 'Estratto vaniglia', category: 'Aromi', unitType: 'ml', packageQuantity: 35, packagePrice: 3.19, active: true },
      { name: 'Ribes', category: 'Frutta', unitType: 'g', packageQuantity: 250, packagePrice: 2.99, active: true },
      { name: 'Frutti di bosco surg.', category: 'Frutta', unitType: 'g', packageQuantity: 300, packagePrice: 4.79, active: true }
    ];
  }

  async function seedDemoData(db) {
    const existing = await getAll('ingredients', db);
    const existingNames = new Set(existing.map(i => i.name.toLowerCase()));

    const demo = createSeedIngredients();
    for (const item of demo) {
      // Se l'ingrediente non esiste ancora (per nome), lo aggiungo
      if (!existingNames.has(item.name.toLowerCase())) {
        item.unitCost = item.packagePrice / item.packageQuantity;
        item.createdAt = new Date().toISOString();
        await addRecord('ingredients', db, item);
      }
    }
  }

  // --- Funzioni Core ---
  function getAll(storeName, db) {
    return new Promise((resolve, reject) => {
      if (!db) return resolve([]);
      const request = getStore(db, storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function getById(storeName, db, id) {
    return new Promise((resolve, reject) => {
      const request = getStore(db, storeName).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  function addRecord(storeName, db, record) {
    return new Promise((resolve, reject) => {
      const request = getStore(db, storeName, 'readwrite').add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function putRecord(storeName, db, record) {
    return new Promise((resolve, reject) => {
      const request = getStore(db, storeName, 'readwrite').put(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function deleteRecord(storeName, db, id) {
    return new Promise((resolve, reject) => {
      const request = getStore(db, storeName, 'readwrite').delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  function clearStore(storeName, db) {
    return new Promise((resolve, reject) => {
      const request = getStore(db, storeName, 'readwrite').clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  function getAllByIndex(storeName, db, indexName, value) {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function syncCakeTotals(db, cakeId, cakeRecord) {
    const rows = await getAllByIndex('cakeIngredients', db, 'cakeId', cakeId);
    const ingredientCost = rows.reduce((sum, row) => sum + Number(row.usedCost || 0), 0);
    const totalCost = ingredientCost + Number(cakeRecord.decorationCost || 0) + Number(cakeRecord.packagingCost || 0) + Number(cakeRecord.energyCost || 0) + Number(cakeRecord.laborCost || 0);
    const salePrice = Number(cakeRecord.salePrice || 0);
    const profit = salePrice - totalCost;
    const marginPercent = salePrice > 0 ? (profit / salePrice) * 100 : 0;
    const updatedCake = { ...cakeRecord, ingredientCost, totalCost, profit, marginPercent, updatedAt: new Date().toISOString() };
    await putRecord('cakes', db, updatedCake);
    return updatedCake;
  }

  async function init() {
    const db = await openDatabase();
    await seedDemoData(db);
    return db;
  }

  return { init, getAll, getById, getAllByIndex, putRecord, addRecord, deleteRecord, clearStore, syncCakeTotals, seedDemoData };
})();
