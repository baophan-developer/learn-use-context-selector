import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import StoreProvider from "./example/StoreContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<StoreProvider>
		<App />
	</StoreProvider>,
);
