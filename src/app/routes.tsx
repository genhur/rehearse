import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { Home } from "./pages/Home";
import { ScenarioSetup } from "./pages/ScenarioSetup";
import { Simulation } from "./pages/Simulation";
import { Conversation } from "./pages/Conversation";
import { Debrief } from "./pages/Debrief";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      {
        index: true,
        Component: Home,
      },
      {
        path: "setup/:scenarioId",
        Component: ScenarioSetup,
      },
      {
        path: "simulation",
        Component: Simulation,
      },
      {
        path: "conversation/:sessionId",
        Component: Conversation,
      },
      {
        path: "conversation/setup/:setupId",
        Component: Conversation,
      },
      {
        path: "debrief/:sessionId",
        Component: Debrief,
      },
    ],
  },
]);
