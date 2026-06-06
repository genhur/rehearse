import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { ScenarioSetup } from "./pages/ScenarioSetup";
import { Simulation } from "./pages/Simulation";
import { Conversation } from "./pages/Conversation";
import { Debrief } from "./pages/Debrief";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/setup/:scenarioId",
    Component: ScenarioSetup,
  },
  {
    path: "/simulation",
    Component: Simulation,
  },
  {
    path: "/conversation/:sessionId",
    Component: Conversation,
  },
  {
    path: "/debrief/:sessionId",
    Component: Debrief,
  },
]);
