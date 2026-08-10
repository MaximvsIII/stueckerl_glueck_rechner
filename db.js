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
      if (!db) return resolve([]);
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

  async function seedDemoData(db) {
    const ingredients = await getAll('ingredients', db);
    if (ingredients.length === 0) {
      const demo = [
        { name: 'Farina 00', category: 'Base', unitType: 'g', packageQuantity: 1000, packagePrice: 1.2, active: true, createdAt: new Date().toISOString() },
        { name: 'Zucchero', category: 'Base', unitType: 'g', packageQuantity: 1000, packagePrice: 1.5, active: true, createdAt: new Date().toISOString() }
      ];
      for (const item of demo) {
        item.unitCost = item.packagePrice / item.packageQuantity;
        await addRecord('ingredients', db, item);
      }
    }
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

  return { init, getAll, getById, getAllByIndex, putRecord, addRecord, deleteRecord, clearStore, syncCakeTotals };
})();
