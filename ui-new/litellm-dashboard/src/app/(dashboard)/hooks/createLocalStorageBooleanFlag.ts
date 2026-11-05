import { LOCAL_STORAGE_EVENT, getLocalStorageItem } from "@/utils/localStorageUtils";
import { useSyncExternalStore } from "react";

export function createLocalStorageBooleanFlag(storageKey: string) {
  function subscribe(callback: () => void) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        callback();
      }
    };

    const onCustom = (e: Event) => {
      const { key } = (e as CustomEvent).detail;
      if (key === storageKey) {
        callback();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_STORAGE_EVENT, onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_STORAGE_EVENT, onCustom);
    };
  }

  function getSnapshot() {
    return getLocalStorageItem(storageKey) === "true";
  }

  return function useLocalStorageBooleanFlag() {
    return useSyncExternalStore(subscribe, getSnapshot);
  };
}
