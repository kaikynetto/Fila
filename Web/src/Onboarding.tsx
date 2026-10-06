import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Layers2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { RichButton } from "@/components/rich-button";
import { Brand, OwnSelect } from "./ui";
import {
  NETWORKS,
  uid,
  accountName,
  accountLabel,
  profileURL,
  type Profile,
  type Account,
  type NotificationStatus,
} from "./domain";
import { requestNotifications } from "./native";

export const TIME_ZONES = {
  "Brasília (GMT−3)": "America/Sao_Paulo",
  Lisboa: "Europe/Lisbon",
  UTC: "UTC",
};
export const zoneLabel = (zone: string) =>
  Object.entries(TIME_ZONES).find(([, value]) => value === zone)?.[0] || zone;

export function AccountFields({
  accounts,
  onChange,
}: {
  accounts: Account[];
  onChange: (accounts: Account[]) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const add = (network: (typeof NETWORKS)[number]) => {
    const count = accounts.filter((a) => a.network === network).length;
    const account: Account = {
      id: uid(),
      network,
      handle: "",
      label: count ? `${network} ${count + 1}` : `${network} principal`,
      kind: "Empresa",
    };
    onChange([...accounts, account]);
    setExpanded(account.id);
  };
  const patch = (id: string, update: Partial<Account>) =>
    onChange(accounts.map((a) => (a.id === id ? { ...a, ...update } : a)));
  return (
    <div className="account-manager">
      <div className="account-add-networks">
        {NETWORKS.map((network) => (
          <button
            key={network}
            onClick={() => add(network)}
            aria-label={`Adicionar conta do ${network}`}
          >
            <Brand network={network} size={18} />
            {network}
            <Plus size={12} />
          </button>
        ))}
      </div>
      <div className="account-editor-list">
        {accounts.map((account) => (
          <div
            className={`account-editor ${expanded === account.id ? "expanded" : ""}`}
            key={account.id}
          >
            <div className="account-editor-heading">
              <Brand network={account.network} size={22} />
              <button
                className="account-heading-name"
                onClick={() =>
                  setExpanded(expanded === account.id ? null : account.id)
                }
              >
                <strong>{accountName(account)}</strong>
                <small>
                  {account.network} ·{" "}
                  {account.handle ? accountLabel(account) : "Informe o perfil"}
                </small>
              </button>
              {account.kind === "Dark" && (
                <span className="account-kind">Dark</span>
              )}
              <button
                className="icon-button"
                aria-label={`Editar ${accountName(account)}`}
                onClick={() =>
                  setExpanded(expanded === account.id ? null : account.id)
                }
              >
                <Pencil size={13} />
              </button>
              <button
                className="icon-button"
                aria-label={`Remover ${accountName(account)}`}
                onClick={() =>
                  onChange(accounts.filter((a) => a.id !== account.id))
                }
              >
                <Trash2 size={13} />
              </button>
            </div>
            {expanded === account.id && (
              <div className="account-editor-fields">
                <div>
                  <label htmlFor={`account-name-${account.id}`}>
                    Nome interno
                  </label>
                  <input
                    id={`account-name-${account.id}`}
                    value={account.label || ""}
                    onChange={(e) =>
                      patch(account.id, { label: e.target.value })
                    }
                    placeholder="Ex.: Zenvo principal, Cortes, Curiosidades"
                    maxLength={80}
                  />
                </div>
                <div>
                  <label htmlFor={`account-handle-${account.id}`}>
                    Perfil ou link
                  </label>
                  <input
                    id={`account-handle-${account.id}`}
                    value={account.handle}
                    onChange={(e) =>
                      patch(account.id, { handle: e.target.value })
                    }
                    placeholder="@usuario ou link do perfil"
                    spellCheck={false}
                  />
                </div>
                <div className="account-kind-field">
                  <label>Tipo da conta</label>
                  <div>
                    <button
                      className={account.kind !== "Dark" ? "selected" : ""}
                      onClick={() => patch(account.id, { kind: "Empresa" })}
                    >
                      Empresa
                    </button>
                    <button
                      className={account.kind === "Dark" ? "selected" : ""}
                      onClick={() => patch(account.id, { kind: "Dark" })}
                    >
                      Dark
                    </button>
                  </div>
                </div>
                <button
                  className="quiet-button"
                  onClick={() => setExpanded(null)}
                >
                  <Check size={12} />
                  Concluir
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!accounts.length && (
        <p className="account-manager-empty">
          Escolha uma rede acima para adicionar sua primeira conta.
        </p>
      )}
      <p className="account-manager-note">
        Você pode adicionar várias contas da mesma rede e dar um nome para cada
        uma.
      </p>
    </div>
  );
}

export function profileError(profile: Profile) {
  if (!profile.userName.trim()) return "Digite seu nome.";
  if (!profile.companyName.trim()) return "Digite o nome da empresa.";
  if (!profile.accounts.length) return "Escolha pelo menos uma rede social.";
  if (profile.accounts.some((a) => a.label !== undefined && !a.label.trim()))
    return "Dê um nome interno a cada conta.";
  if (profile.accounts.some((a) => !a.handle.trim()))
    return "Preencha o perfil de cada rede escolhida.";
  const urls = profile.accounts.map((a) =>
    profileURL(a)
      .replace("https://www.", "https://")
      .replace(/\/$/, "")
      .toLowerCase(),
  );
  if (new Set(urls).size !== urls.length)
    return "Este perfil já foi adicionado. Use outro perfil para a nova conta.";
  return null;
}

export default function Onboarding({
  onFinish,
  notificationStatus,
  onNotification,
}: {
  onFinish: (profile: Profile) => Promise<void>;
  notificationStatus: NotificationStatus;
  onNotification: (status: NotificationStatus) => void;
}) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({
    userName: "",
    companyName: "",
    timeZone: "America/Sao_Paulo",
    accounts: [],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const advance = async () => {
    const issue =
      step === 0
        ? !profile.userName.trim()
          ? "Digite seu nome."
          : !profile.companyName.trim()
            ? "Digite o nome da empresa."
            : null
        : profileError(profile);
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      await onFinish({
        ...profile,
        userName: profile.userName.trim(),
        companyName: profile.companyName.trim(),
        accounts: profile.accounts.map((a) => ({
          ...a,
          handle: a.handle.trim(),
        })),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const permission = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await requestNotifications();
      onNotification(result.status);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="onboarding-page">
      <div className="onboarding-content">
        <div className="onboarding-brand">
          <Layers2 size={21} />
          <span>Fila</span>
        </div>
        <h1>
          {step === 0
            ? "Seu conteúdo começa aqui."
            : step === 1
              ? "As contas da sua empresa."
              : "Um lembrete na hora certa."}
        </h1>
        <p className="onboarding-subtitle">
          {step === 0
            ? "Um espaço para organizar o que sua empresa vai publicar."
            : step === 1
              ? "Adicione os perfis da empresa e dos seus projetos dark."
              : `Tudo pronto, ${profile.userName.split(" ")[0]}. Agora escolha como o Mac vai te lembrar.`}
        </p>
        <nav className="creation-steps" aria-label="Configuração do Fila">
          {["Seu espaço", "Suas contas", "Lembretes"].map((name, i) => (
            <button
              key={name}
              className={step === i ? "active" : ""}
              disabled={i > step || busy}
              onClick={() => {
                setStep(i);
                setError("");
              }}
            >
              <span>{i < step ? <Check size={12} /> : i + 1}</span>
              {name}
              {i < 2 && <ChevronRight size={12} />}
            </button>
          ))}
        </nav>
        {step === 0 && (
          <div className="onboarding-basics">
            <div>
              <label htmlFor="your-name">Como você se chama?</label>
              <input
                id="your-name"
                value={profile.userName}
                onChange={(e) =>
                  setProfile({ ...profile, userName: e.target.value })
                }
                placeholder="Seu nome"
                maxLength={80}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="company-name">Nome da empresa</label>
              <input
                id="company-name"
                value={profile.companyName}
                onChange={(e) =>
                  setProfile({ ...profile, companyName: e.target.value })
                }
                placeholder="Empresa, marca ou projeto"
                maxLength={100}
              />
            </div>
            <p>Você pode alterar esses dados nas preferências.</p>
          </div>
        )}
        {step === 1 && (
          <AccountFields
            accounts={profile.accounts}
            onChange={(accounts) => setProfile({ ...profile, accounts })}
          />
        )}
        {step === 2 && (
          <div className="onboarding-notifications">
            <div className="onboarding-bell">
              <Bell size={28} strokeWidth={1.3} />
            </div>
            <h2>O Fila organiza. O Mac avisa.</h2>
            <p>
              Receba um aviso no horário da postagem ou alguns minutos antes,
              mesmo com o app fechado.
            </p>
            <button
              className="quiet-button"
              onClick={permission}
              disabled={busy || notificationStatus === "authorized"}
            >
              {notificationStatus === "authorized" ? (
                <>
                  <Check size={14} />
                  Notificações ativadas
                </>
              ) : notificationStatus === "denied" ? (
                "Tentar ativar notificações"
              ) : (
                "Permitir notificações"
              )}
            </button>
            {notificationStatus === "denied" && (
              <p className="notification-help">
                Ative o Fila nos ajustes de Notificações do macOS. Você pode
                continuar e fazer isso depois.
              </p>
            )}
            <div className="onboarding-zone">
              <label htmlFor="onboarding-zone">Fuso dos seus posts</label>
              <OwnSelect
                id="onboarding-zone"
                label="Fuso horário"
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
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer className="creation-footer">
        <div className="onboarding-footer-inner">
          <button
            onClick={() => {
              setStep(step - 1);
              setError("");
            }}
            disabled={step === 0 || busy}
          >
            {step > 0 && (
              <>
                <ArrowLeft size={13} />
                Voltar
              </>
            )}
          </button>
          <span>
            {step === 2 && notificationStatus !== "authorized"
              ? "Você pode ativar os avisos depois."
              : "Seu planejamento fica salvo neste Mac."}
          </span>
          <RichButton color="blue" onClick={advance} disabled={busy}>
            {busy ? "Salvando…" : step === 2 ? "Criar meu espaço" : "Continuar"}
            <ChevronRight size={15} />
          </RichButton>
        </div>
      </footer>
    </div>
  );
}
