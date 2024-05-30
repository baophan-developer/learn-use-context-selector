import {createContext} from "@/hooks";
import {Dispatch, PropsWithChildren, SetStateAction, useState} from "react";

export type Profile = {
	username: string;
};

export type Product = {
	name: string;
	price: number;
};

export type Store = {
	profile: Profile;
	proFavorites: Product[];
};

const defaultStore: Store = {
	profile: {
		username: "",
	},
	proFavorites: [],
};

export type StoreContext<T> = [store: T, setStore: Dispatch<SetStateAction<T>>];

const defaultStoreContext: StoreContext<Store> = [defaultStore, () => {}];

export const StoreContextApp = createContext<StoreContext<Store>>(defaultStoreContext);

const StoreProvider = (props: PropsWithChildren<unknown>) => {
	const {children} = props;
	const [store, setStore] = useState<Store>(defaultStore);

	return (
		<StoreContextApp.Provider value={[store, setStore]}>
			{children}
		</StoreContextApp.Provider>
	);
};

export default StoreProvider;
