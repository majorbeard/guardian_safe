import { render } from "preact";
import App from "./app.tsx";
import "./index.css";
import { trackPageLoad } from "./utils/performance";

trackPageLoad();

render(<App />, document.getElementById("app")!);
