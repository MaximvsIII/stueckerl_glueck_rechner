const CakeDB = (() => {
  const DB_NAME = 'CalcolatoreTorteDB';
  const DB_VERSION = 3;
  const STORE_NAMES = ['ingredients', 'cakes', 'cakeIngredients', 'recipes', 'settings'];

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        STORE_NAMES.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
            if (name === 'cakeIngredients') {
              store.createIndex('cakeId', 'cakeId', { unique: false });
            }
          }
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAll(storeName, db) {
    return new Promise((resolve, reject) => {
      if (!db) return resolve([]);
      try {
        const tx = db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) { resolve([]); }
    });
  }

  async function seedDemoData(db, lang = 'it', force = false) {
    if (!force) {
      const existing = await getAll('ingredients', db);
      if (existing.length > 0) return;
    }

    const t = (key) => (Translations[lang] && Translations[lang][key]) || Translations['it'][key];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['ingredients'], 'readwrite');
      const store = tx.objectStore('ingredients');

      if (force) store.clear();

      const demo = [
        { name: t('ing_eggs'), translationKey: 'ing_eggs', category: 'cat_eggs', unitType: 'piece', packageQuantity: 10, packagePrice: 2.79 },
        { name: t('ing_flour'), translationKey: 'ing_flour', category: 'cat_flour', unitType: 'g', packageQuantity: 1000, packagePrice: 1.59 },
        { name: t('ing_sugar'), translationKey: 'ing_sugar', category: 'cat_sugar', unitType: 'g', packageQuantity: 1000, packagePrice: 1.79 },
        { name: t('ing_butter'), translationKey: 'ing_butter', category: 'cat_dairy', unitType: 'g', packageQuantity: 250, packagePrice: 2.79 },
        { name: t('ing_cream'), translationKey: 'ing_cream', category: 'cat_dairy', unitType: 'ml', packageQuantity: 250, packagePrice: 1.49 },
        { name: t('ing_mascarpone'), translationKey: 'ing_mascarpone', category: 'cat_dairy', unitType: 'g', packageQuantity: 500, packagePrice: 4.39 },
        { name: t('ing_chocolate'), translationKey: 'ing_chocolate', category: 'cat_chocolate', unitType: 'g', packageQuantity: 200, packagePrice: 2.99 },
        { name: t('ing_yeast'), translationKey: 'ing_yeast', category: 'cat_yeast', unitType: 'g', packageQuantity: 16, packagePrice: 0.50 },
        { name: t('ing_vanilla'), translationKey: 'ing_vanilla', category: 'cat_flavors', unitType: 'ml', packageQuantity: 30, packagePrice: 4.50 },
        { name: t('ing_strawberries'), translationKey: 'ing_strawberries', category: 'cat_fruit', unitType: 'g', packageQuantity: 250, packagePrice: 3.50 }
      ];

      demo.forEach(item => {
        item.unitCost = item.packagePrice / item.packageQuantity;
        item.createdAt = new Date().toISOString();
        store.add(item);
      });
      tx.oncomplete = () => resolve();
    });
  }

  return {
    init: async (lang = 'it') => {
      const db = await openDatabase();
      await seedDemoData(db, lang);
      return db;
    },
    getAll,
    seedDemoData,
    getById: (store, db, id) => new Promise((res, rej) => {
      const req = db.transaction([store], 'readonly').objectStore(store).get(id);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    }),
    addRecord: (store, db, rec) => new Promise((res, rej) => {
      const req = db.transaction([store], 'readwrite').objectStore(store).add(rec);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    }),
    putRecord: (store, db, rec) => new Promise((res, rej) => {
      const req = db.transaction([store], 'readwrite').objectStore(store).put(rec);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    }),
    deleteRecord: (store, db, id) => new Promise((res, rej) => {
      const req = db.transaction([store], 'readwrite').objectStore(store).delete(id);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    }),
    getAllByIndex: (store, db, idx, val) => new Promise((res, rej) => {
      const s = db.transaction([store], 'readonly').objectStore(store);
      const req = s.index(idx).getAll(val);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    }),
    syncCakeTotals: async (db, cakeId, cakeRecord) => {
      const rows = await new Promise((res) => {
        const s = db.transaction(['cakeIngredients'], 'readonly').objectStore('cakeIngredients');
        const req = s.index('cakeId').getAll(cakeId);
        req.onsuccess = () => res(req.result || []);
      });
      const ingredientCost = rows.reduce((sum, r) => sum + (r.usedCost || 0), 0);
      const totalCost = ingredientCost + (cakeRecord.decorationCost || 0) + (cakeRecord.packagingCost || 0) + (cakeRecord.energyCost || 0) + (cakeRecord.laborCost || 0);
      const profit = (cakeRecord.salePrice || 0) - totalCost;
      const marginPercent = cakeRecord.salePrice > 0 ? (profit / cakeRecord.salePrice) * 100 : 0;
      const updated = { ...cakeRecord, ingredientCost, totalCost, profit, marginPercent, updatedAt: new Date().toISOString() };
      await new Promise((res) => {
        const req = db.transaction(['cakes'], 'readwrite').objectStore('cakes').put(updated);
        req.onsuccess = () => res();
      });
      return updated;
    }
  };
})();
