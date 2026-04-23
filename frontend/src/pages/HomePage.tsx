import "./HomePage.css";
// @ts-expect-error Claude homepage is currently JS-first and incrementally typed.
import ClaudeHome from "../claude-home/App.jsx";

export default function HomePage() {
  return <ClaudeHome />;
}
