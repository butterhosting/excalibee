import { useEffect, useState } from "react";
import { createBrowserRouter, replace, RouterProvider } from "react-router";
import { ClientRegistry } from "./ClientRegistry";
import { DialogClient } from "./clients/DialogClient";
import { DialogManager } from "./comps/DialogManager";
import { editorPage } from "./pages/editor.page";
import { libraryPage } from "./pages/library.page";
import { Route } from "./Route";

const router = createBrowserRouter([
  {
    path: Route.library(),
    Component: libraryPage,
  },
  {
    path: Route.library(":folderId"),
    Component: libraryPage,
  },
  {
    path: Route.drawing(":id"),
    Component: editorPage,
  },
  {
    path: "*",
    loader: () => replace(Route.library()),
  },
]);

export function Website() {
  const [clientRegistry, setClientRegistry] = useState<ClientRegistry>();
  useEffect(() => {
    ClientRegistry.bootstrap().then(setClientRegistry);
  }, []);
  if (clientRegistry) {
    return (
      <ClientRegistry.Context.Provider value={clientRegistry}>
        <RouterProvider router={router} />
        <DialogManager ref={(m) => clientRegistry.get(DialogClient).initialize(m)} />
      </ClientRegistry.Context.Provider>
    );
  }
  return null;
}
