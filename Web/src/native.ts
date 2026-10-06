import type {
  Attachment,
  LoadResult,
  NotificationStatus,
  Workspace,
} from "./domain";
import { emptyWorkspace } from "./domain";

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        fila?: {
          postMessage: (message: {
            action: string;
            payload: unknown;
          }) => Promise<unknown>;
        };
      };
    };
  }
}

export async function callNative<T>(
  action: string,
  payload: unknown = {},
): Promise<T> {
  const bridge = window.webkit?.messageHandlers?.fila;
  if (bridge) return (await bridge.postMessage({ action, payload })) as T;
  if (import.meta.env.DEV) {
    if (action === "load")
      return {
        state: JSON.parse(
          localStorage.getItem("fila-dev") || JSON.stringify(emptyWorkspace()),
        ),
        notifications: "notDetermined",
        pending: 0,
        demo: true,
      } as T;
    if (action === "save") {
      localStorage.setItem("fila-dev", JSON.stringify(payload));
      return {
        state: payload,
        notifications: "notDetermined",
        pending: 0,
        demo: true,
      } as T;
    }
    if (action === "copyText") {
      await navigator.clipboard.writeText((payload as { text: string }).text);
      return { ok: true } as T;
    }
    throw new Error("Esta ação requer o app de macOS.");
  }
  throw new Error(
    "Não foi possível acessar os dados do Mac. Feche e abra o Fila novamente.",
  );
}
export const loadWorkspace = () => callNative<LoadResult>("load");
export const saveWorkspace = (state: Workspace) =>
  callNative<LoadResult>("save", state);
export const importFiles = () =>
  callNative<{ files: Attachment[] }>("importFiles");
export const requestNotifications = () =>
  callNative<{ status: NotificationStatus; pending: number }>(
    "notificationPermission",
  );
export const fileURL = (file: Attachment) =>
  `fila-media://media/${file.storageName}`;
