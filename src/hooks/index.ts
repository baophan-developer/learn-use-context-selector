import {
	ComponentType,
	MutableRefObject,
	Provider,
	ReactNode,
	createElement,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	createContext as createContextReactJS,
	useContext as useContextReactJS,
	Context as ContextReactJS,
	useReducer,
} from "react";
import {
	unstable_NormalPriority as NormalPriority,
	unstable_runWithPriority as runWithPriority,
} from "scheduler";

const CONTEXT_VALUE = Symbol();
const ORIGINAL_PROVIDER = Symbol();

const isSSR =
	typeof window === "undefined" ||
	/ServerSideRendering/.test(window.navigator && window.navigator.userAgent);

const useIsomorphicLayoutEffect = isSSR ? useEffect : useLayoutEffect;

const runWithNormalPriority = runWithPriority
	? (fn: () => void) => {
			try {
				runWithPriority(NormalPriority, fn);
			} catch (e) {
				if ((e as {message: unknown}).message === "Not implemented.") {
					fn();
				} else {
					throw e;
				}
			}
	  }
	: (fn: () => void) => fn();

type Version = number;
type Listener<Value> = (action: {n: Version; p?: Promise<Value>; v?: Value}) => void;

type ContextValue<Value> = {
	[CONTEXT_VALUE]: {
		/** value */ v: MutableRefObject<Value>;
		/** version */ n: MutableRefObject<Version>;
		/** listener */ l: Set<Listener<Value>>;
		/** update */ u: (fn: () => void, options?: {suspense: boolean}) => void;
	};
};

export interface Context<Value> {
	Provider: ComponentType<{value: Value; children: ReactNode}>;
	displayName?: string;
}

const createProvider = <Value>(ProviderOrig: Provider<ContextValue<Value>>) => {
	const ContextProvider = ({value, children}: {value: Value; children: ReactNode}) => {
		const valueRef = useRef(value);
		const versionRef = useRef(0);
		const [resolve, setResolve] = useState<((v: Value) => void) | null>(null);
		if (resolve) {
			resolve(value);
			setResolve(null);
		}
		const contextValue = useRef<ContextValue<Value>>();
		if (!contextValue.current) {
			const listeners = new Set<Listener<Value>>();
			const update = (fn: () => void, options?: {suspense: boolean}) => {
				versionRef.current += 1;
				const action: Parameters<Listener<Value>>[0] = {
					n: versionRef.current,
				};
				if (options?.suspense) {
					action.n *= -1;
					action.p = new Promise<Value>((r) => {
						setResolve(() => (v: Value) => {
							action.v = v;
							delete action.p;
							r(v);
						});
					});
				}
				listeners.forEach((listener) => listener(action));
				fn();
			};
			contextValue.current = {
				[CONTEXT_VALUE]: {
					v: valueRef,
					n: versionRef,
					l: listeners,
					u: update,
				},
			};
		}
		useIsomorphicLayoutEffect(() => {
			valueRef.current = value;
			versionRef.current += 1;
			runWithNormalPriority(() => {
				(contextValue.current as ContextValue<Value>)[CONTEXT_VALUE].l.forEach(
					(listener) => {
						listener({n: versionRef.current, v: value});
					},
				);
			});
		}, [value]);

		return createElement(ProviderOrig, {value: contextValue.current, children});
	};
	return ContextProvider;
};

const identity = <T>(x: T) => x;

export function createContext<Value>(defaultValue: Value) {
	const context = createContextReactJS<ContextValue<Value>>({
		[CONTEXT_VALUE]: {
			v: {current: defaultValue},
			n: {current: -1},
			l: new Set(),
			u: (f) => f(),
		},
	});
	(
		context as unknown as {
			[ORIGINAL_PROVIDER]: Provider<ContextValue<Value>>;
		}
	)[ORIGINAL_PROVIDER] = context.Provider;
	(context as unknown as Context<Value>).Provider = createProvider(context.Provider);
	delete (context as {Consumer: unknown}).Consumer;
	return context as unknown as Context<Value>;
}

const useContextSelector = <Value, Selected>(
	context: Context<Value>,
	selector: (value: Value) => Selected,
) => {
	const contextValue = useContextReactJS(
		context as unknown as ContextReactJS<ContextValue<Value>>,
	)[CONTEXT_VALUE];

	if (typeof process === "object" && process.env.NODE_ENV !== "production") {
		if (!contextValue) {
			throw new Error("useContextSelector requires special context");
		}
	}

	const {
		v: {current: value},
		n: {current: version},
		l: listeners,
	} = contextValue;

	const selected = selector(value);

	const [state, dispatch] = useReducer(
		(prev: readonly [Value, Selected], action?: Parameters<Listener<Value>>[0]) => {
			if (!action) {
				return [value, selected] as const;
			}

			if ("p" in action) {
				throw action.p;
			}

			if (action.n === version) {
				if (Object.is(prev[1], selected)) {
					return prev;
				}
				return [value, selected] as const;
			}

			try {
				if ("v" in action) {
					if (Object.is(prev[0], action.v)) {
						return prev;
					}
					const nextSelected = selector(action.v);

					if (Object.is(prev[1], nextSelected)) {
						return prev;
					}

					return [action.v, nextSelected] as const;
				}
			} catch (error) {
				// ignored
			}
			return [...prev] as const;
		},
		[value, selected] as const,
	);
};
