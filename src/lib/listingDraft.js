const STORAGE_KEY = 'ha-cozy-pad-listing-draft';

export function getListingDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export function updateListingDraft(patch) {
  const draft = { ...getListingDraft(), ...patch };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  return draft;
}

export function clearListingDraft() {
  sessionStorage.removeItem(STORAGE_KEY);
}
