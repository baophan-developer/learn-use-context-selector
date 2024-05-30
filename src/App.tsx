import {Controller, FormProvider, useForm} from "react-hook-form";
import "./App.css";
import {useSetStore, useStore} from "./example/storeHook";

function App() {
	const formMethods = useForm<{username: string}>({
		defaultValues: {
			username: "",
		},
	});

	const setStore = useSetStore();
	const username = useStore<string>((s) => s.profile.username);

	const onSubmit = (value: {username: string}) => {
		setStore((prev) => ({
			...prev,
			profile: {
				...prev.profile,
				username: value.username,
			},
		}));
	};

	return (
		<div>
			<div>
				<FormProvider {...formMethods}>
					<form onSubmit={formMethods.handleSubmit(onSubmit)}>
						<Controller
							name='username'
							control={formMethods.control}
							render={({field}) => {
								return <input {...field} />;
							}}
						/>
						<button type='submit'>Submit</button>
					</form>
				</FormProvider>
			</div>
			<div>
				<div>{username}</div>
			</div>
		</div>
	);
}

export default App;
