import { render } from "preact";
import "../../mobile/src/index.css";
import { App } from "./app.tsx";

render(<App />, document.getElementById("app")!);
