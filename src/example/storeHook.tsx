import {useContextSelector} from "@/hooks";
import {Store, StoreContextApp} from "./StoreContext";

function useStore<Selected>(fn: (x: Store) => Selected) {
	const store = useContextSelector(StoreContextApp, (s) => fn(s[0]));
	return store;
}

function useSetStore() {
	const setStore = useContextSelector(StoreContextApp, (s) => s[1]);
	return setStore;
}

export {useStore, useSetStore};
