const memoryStorage = new Map();

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function getItem(key) {
  const storage = browserStorage();
  return storage ? storage.getItem(key) : (memoryStorage.get(key) ?? null);
}

async function setItem(key, value) {
  const storage = browserStorage();
  if (storage) storage.setItem(key, value);
  else memoryStorage.set(key, value);
}

async function removeItem(key) {
  const storage = browserStorage();
  if (storage) storage.removeItem(key);
  else memoryStorage.delete(key);
}

async function clear() {
  const storage = browserStorage();
  if (storage) storage.clear();
  else memoryStorage.clear();
}

async function getAllKeys() {
  const storage = browserStorage();
  return storage ? Object.keys(storage) : [...memoryStorage.keys()];
}

async function multiGet(keys) {
  return Promise.all(keys.map(async (key) => [key, await getItem(key)]));
}

async function multiSet(entries) {
  await Promise.all(entries.map(([key, value]) => setItem(key, value)));
}

async function multiRemove(keys) {
  await Promise.all(keys.map(removeItem));
}

const asyncStorage = {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys,
  multiGet,
  multiSet,
  multiRemove,
};

export default asyncStorage;
