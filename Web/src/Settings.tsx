import { useState } from "react";
import { Bell, Check, Download, FolderOpen } from "lucide-react";
import { RichButton } from "@/components/rich-button";
import { OwnSelect } from "./ui";
import {
  AccountFields,
  profileError,
  TIME_ZONES,
  zoneLabel,
} from "./Onboarding";
import { callNative, requestNotifications } from "./native";
import type { NotificationStatus, Profile, Workspace } from "./domain";

export default function Settings({
  state,
  notifications,
  pending,
  onSave,
  onNotifications,
  onMessage,
}: {
  state: Workspace;
  notifications: NotificationStatus;
  pending: number;
  onSave: (profile: Profile) => Promise<void>;
  onNotifications: (status: NotificationStatus) => void;
  onMessage: (message: string, error?: boolean) => void;
}) {
  const [profile, setProfile] = useState(state.profile!);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    const issue = profileError(profile);
    if (issue) {
      setError(issue);
      return;
    }
    const ids = profile.accounts.map((a) => a.id);
    if (
      [...state.posts, ...state.trash].some((p) => !ids.includes(p.accountId))
    ) {
      setError(
        "Esta conta tem postagens ou itens na lixeira. Mantenha a conta para preservar os vínculos.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...profile,
        userName: profile.userName.trim(),
        companyName: profile.companyName.trim(),
        accounts: profile.accounts.map((a) => ({
          ...a,
          handle: a.handle.trim(),
        })),
      });
      onMessage("Preferências salvas.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const enable = async () => {
    try {
      const response = await requestNotifications();
      onNotifications(response.status);
      if (response.status === "authorized") onMessage("Lembretes ativados.");
      else
        onMessage("Ative o Fila nos ajustes de Notificações do macOS.", true);
    } catch (e) {
      onMessage((e as Error).message, true);
    }
  };
  const nativeAction = async (action: string, message?: string) => {
    try {
      const result = await callNative<{ saved?: boolean }>(action);
      if (message && result.saved !== false) onMessage(message);
    } catch (e) {
      onMessage((e as Error).message, true);
    }
  };
  return (
    <div className="settings-scroll">
      <section className="settings-section">
        <h2>Seu espaço</h2>
        <div className="settings-fields">
          <div>
            <label htmlFor="settings-user">Seu nome</label>
            <input
              id="settings-user"
              value={profile.userName}
              onChange={(e) =>
                setProfile({ ...profile, userName: e.target.value })
              }
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="settings-company">Empresa</label>
            <input
              id="settings-company"
              value={profile.companyName}
              onChange={(e) =>
                setProfile({ ...profile, companyName: e.target.value })
              }
              maxLength={100}
            />
          </div>
        </div>
        <div className="settings-zone">
          <label htmlFor="settings-zone">Fuso das postagens</label>
          <OwnSelect
            id="settings-zone"
            label="Fuso das postagens"
            value={zoneLabel(profile.timeZone)}
            options={Object.keys(TIME_ZONES)}
            onChange={(label) =>
              setProfile({
                ...profile,
                timeZone: TIME_ZONES[label as keyof typeof TIME_ZONES],
              })
            }
          />
        </div>
      </section>
      <section className="settings-section">
        <h2>Perfis da empresa</h2>
        <p>Edite os nomes e links dos perfis usados no planejamento.</p>
        <AccountFields
          accounts={profile.accounts}
          onChange={(accounts) => setProfile({ ...profile, accounts })}
        />
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <RichButton color="blue" onClick={save} disabled={busy}>
        {busy ? "Salvando…" : "Salvar preferências"}
      </RichButton>
      <section className="settings-section notification-settings">
        <h2>Lembretes do Mac</h2>
        <p>
          {notifications === "authorized"
            ? `${pending} ${pending === 1 ? "lembrete agendado" : "lembretes agendados"} pelo macOS.`
            : notifications === "denied"
              ? "As notificações do Fila estão desativadas nos ajustes do macOS."
              : "Permita as notificações para receber avisos de postagem."}
        </p>
        <div>
          <button className="quiet-button" onClick={enable}>
            {notifications === "authorized" ? (
              <Check size={14} />
            ) : (
              <Bell size={14} />
            )}{" "}
            {notifications === "authorized"
              ? "Verificar permissão"
              : "Permitir notificações"}
          </button>
          <button
            className="quiet-button"
            onClick={() =>
              nativeAction(
                "notificationTest",
                "Um lembrete de teste chegará em 5 segundos.",
              )
            }
            disabled={notifications !== "authorized"}
          >
            Testar lembrete
          </button>
          <button
            className="quiet-button"
            onClick={() => nativeAction("openSystemSettings")}
          >
            Abrir ajustes do macOS
          </button>
        </div>
      </section>
      <section className="settings-section">
        <h2>Seus dados</h2>
        <p>O planejamento e as cópias dos arquivos ficam neste Mac.</p>
        <div className="data-actions">
          <button
            className="quiet-button"
            onClick={() => nativeAction("revealData")}
          >
            <FolderOpen size={14} />
            Abrir pasta de dados
          </button>
          <button
            className="quiet-button"
            onClick={() =>
              nativeAction("exportData", "Planejamento exportado.")
            }
          >
            <Download size={14} />
            Exportar planejamento
          </button>
        </div>
      </section>
    </div>
  );
}
