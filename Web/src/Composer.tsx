import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FolderOpen,
  Globe2,
  Upload,
  X,
} from "lucide-react";
import { RichButton } from "@/components/rich-button";
import { LabelInput } from "@/components/label-input";
import { Brand, OwnDatePicker, OwnSelect, Media } from "./ui";
import {
  accountLabel,
  accountName,
  bytesLabel,
  formats,
  postValidation,
  reminderInstant,
  reminderLabel,
  reminderMinutes,
  REMINDERS,
  validTime,
  type Profile,
  type Post,
  type Attachment,
  type Status,
  notificationDate,
} from "./domain";
import { importFiles } from "./native";
import { zoneLabel } from "./Onboarding";

export default function Composer({
  profile,
  initial,
  initialStep = 0,
  onSave,
  onClose,
}: {
  profile: Profile;
  initial: Post;
  initialStep?: number;
  onSave: (post: Post) => Promise<void>;
  onClose: () => void;
}) {
  const [post, setPost] = useState(initial);
  const [step, setStep] = useState(initialStep);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const account = profile.accounts.find((a) => a.id === post.accountId)!;
  const notice = reminderInstant(
    { ...post, status: "Planejado" },
    profile.timeZone,
  );
  const patch = (update: Partial<Post>) => {
    setPost((p) => ({ ...p, ...update }));
    setError("");
  };
  const append = (files: Attachment[]) =>
    setPost((p) => ({
      ...p,
      attachments: [
        ...p.attachments,
        ...files.filter((f) => !p.attachments.some((a) => a.id === f.id)),
      ],
    }));
  useEffect(() => {
    const dropped = (event: Event) =>
      append((event as CustomEvent<Attachment[]>).detail);
    window.addEventListener("fila-files", dropped);
    return () => window.removeEventListener("fila-files", dropped);
  }, []);
  const chooseFiles = async () => {
    setBusy(true);
    setError("");
    try {
      append((await importFiles()).files);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const move = (id: string, delta: number) => {
    const files = [...post.attachments],
      index = files.findIndex((f) => f.id === id),
      target = index + delta;
    if (target < 0 || target >= files.length) return;
    const [file] = files.splice(index, 1);
    files.splice(target, 0, file);
    patch({ attachments: files });
  };
  const save = async (status: Status) => {
    const issue = postValidation(post, profile, status === "Planejado");
    if (issue) {
      setError(issue);
      if (!post.title.trim()) setStep(0);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...post,
        title: post.title.trim(),
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    if (JSON.stringify(post) !== JSON.stringify(initial)) setDiscard(true);
    else onClose();
  };
  return (
    <div className="creation-page">
      <header className="creation-topbar">
        <button onClick={close} disabled={busy}>
          <ArrowLeft size={15} />
          Voltar à agenda
        </button>
      </header>
      <div className="creation-scroll">
        <div className="creation-content">
          <div className="creation-intro">
            <h1>{initial.title ? "Editar postagem" : "Nova postagem"}</h1>
            <p>Organize o conteúdo e escolha quando postar.</p>
          </div>
          <nav className="creation-steps" aria-label="Etapas de criação">
            {["Conteúdo", "Arquivos", "Agendamento"].map((name, i) => (
              <button
                key={name}
                onClick={() => {
                  setStep(i);
                  setError("");
                }}
                className={step === i ? "active" : ""}
                aria-current={step === i ? "step" : undefined}
                disabled={busy}
              >
                <span>{i < step ? <Check size={12} /> : i + 1}</span>
                {name}
                {i < 2 && <ChevronRight size={12} />}
              </button>
            ))}
          </nav>
          <section
            className="creation-stage"
            hidden={step !== 0}
            aria-label="Conteúdo da postagem"
          >
            <div className="creation-field">
              <label htmlFor="creation-title">Título da postagem</label>
              <LabelInput
                id="creation-title"
                label=""
                placeholder="Ex.: Bastidores da empresa"
                value={post.title}
                onChange={(e) => patch({ title: e.target.value })}
                ringColor="blue"
                containerClassName="creation-label-input"
                autoFocus
                maxLength={180}
              />
            </div>
            <div className="creation-field">
              <label>Conta da postagem</label>
              <div className="creation-network-options">
                {profile.accounts.map((a) => (
                  <button
                    key={a.id}
                    className={a.id === post.accountId ? "selected" : ""}
                    onClick={() =>
                      patch({
                        accountId: a.id,
                        network: a.network,
                        format: formats(a.network)[0],
                      })
                    }
                    aria-pressed={a.id === post.accountId}
                  >
                    <Brand network={a.network} size={22} />
                    <div>
                      <strong>{accountName(a)}</strong>
                      <small>
                        {a.network} · {accountLabel(a)}
                      </small>
                    </div>
                    {a.id === post.accountId && <Check size={13} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="creation-field creation-format-field">
              <label htmlFor="creation-format">Formato</label>
              <OwnSelect
                id="creation-format"
                value={post.format}
                options={formats(post.network)}
                onChange={(format) => patch({ format })}
                label="Formato"
              />
            </div>
            <div className="creation-field">
              <label htmlFor="creation-caption">
                Legenda <small>opcional</small>
              </label>
              <textarea
                id="creation-caption"
                value={post.caption}
                onChange={(e) => patch({ caption: e.target.value })}
                placeholder="Escreva a legenda e as hashtags…"
              />
            </div>
          </section>
          <section
            className="creation-stage"
            hidden={step !== 1}
            aria-label="Arquivos da postagem"
          >
            <div
              className={`creation-upload ${post.attachments.length ? "has-files" : ""}`}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload size={30} strokeWidth={1.2} />
              <h2>Os arquivos desta postagem</h2>
              <p>Arraste imagens, vídeos ou PDFs para cá.</p>
              <button
                className="quiet-button"
                onClick={chooseFiles}
                disabled={busy}
              >
                {busy
                  ? "Importando…"
                  : post.attachments.length
                    ? "Adicionar arquivos"
                    : "Escolher arquivos no Mac"}
              </button>
            </div>
            {post.attachments.length > 0 ? (
              <div className="composer-file-list">
                {post.attachments.map((f, i) => (
                  <div className="composer-file" key={f.id}>
                    <Media file={f} compact />
                    <div>
                      <strong>{f.name}</strong>
                      <small>
                        {bytesLabel(f.size)} · arquivo {i + 1} de{" "}
                        {post.attachments.length}
                      </small>
                    </div>
                    <button
                      aria-label={`Mover ${f.name} para cima`}
                      disabled={i === 0 || busy}
                      onClick={() => move(f.id, -1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      aria-label={`Mover ${f.name} para baixo`}
                      disabled={i === post.attachments.length - 1 || busy}
                      onClick={() => move(f.id, 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      aria-label={`Remover ${f.name}`}
                      disabled={busy}
                      onClick={() =>
                        patch({
                          attachments: post.attachments.filter(
                            (a) => a.id !== f.id,
                          ),
                        })
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="creation-files-hint">
                <FolderOpen size={17} />
                <div>
                  <strong>Arquivos, legenda e horário ficam juntos.</strong>
                  <p>Você também pode planejar uma postagem só de texto.</p>
                </div>
              </div>
            )}
          </section>
          <section
            className="creation-stage"
            hidden={step !== 2}
            aria-label="Agendamento da postagem"
          >
            <div className="creation-post-summary">
              <span>
                <Brand network={post.network} size={22} />
              </span>
              <div>
                <h2>{post.title || "Sua nova postagem"}</h2>
                <p>
                  {accountName(account)} · {post.network} · {post.format} ·{" "}
                  {accountLabel(account)}
                </p>
              </div>
            </div>
            <div className="creation-schedule-row">
              <div>
                <label htmlFor="creation-date">Dia da postagem</label>
                <OwnDatePicker
                  id="creation-date"
                  value={post.date}
                  onChange={(date) => patch({ date })}
                />
              </div>
              <div>
                <label htmlFor="creation-time">Horário</label>
                <div className="creation-time-field">
                  <Clock3 size={15} />
                  <input
                    id="creation-time"
                    inputMode="numeric"
                    maxLength={5}
                    value={post.time}
                    onChange={(e) => patch({ time: e.target.value })}
                    onBlur={() => {
                      if (!validTime(post.time))
                        setError("Use um horário válido, como 18:00.");
                    }}
                    placeholder="18:00"
                    aria-label="Horário da postagem"
                  />
                </div>
              </div>
            </div>
            <div className="creation-timezone">
              <Globe2 size={12} />
              {zoneLabel(profile.timeZone)}
            </div>
            <div className="creation-reminder-field">
              <label htmlFor="creation-reminder">
                Quando você quer ser lembrado?
              </label>
              <OwnSelect
                id="creation-reminder"
                value={reminderLabel(post.reminderMinutes)}
                options={REMINDERS}
                onChange={(label) =>
                  patch({ reminderMinutes: reminderMinutes(label) })
                }
                label="Quando você quer ser lembrado?"
              />
            </div>
            <div className="creation-reminder-note">
              <Bell size={18} />
              <div>
                <p>
                  {notice
                    ? `Aviso no Mac: ${notificationDate(notice, profile.timeZone)}`
                    : "Este post ficará sem lembrete."}
                </p>
                <small>O Fila te lembra. Você publica na rede social.</small>
              </div>
            </div>
          </section>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {discard && (
            <div className="discard-prompt" role="alert">
              <p>Você tem alterações nesta postagem.</p>
              <button
                className="quiet-button"
                onClick={() => setDiscard(false)}
              >
                Continuar editando
              </button>
              <button
                className="quiet-button"
                onClick={() => save("Rascunho")}
                disabled={busy}
              >
                Salvar rascunho
              </button>
              <button className="text-button" onClick={onClose}>
                Descartar alterações
              </button>
            </div>
          )}
        </div>
      </div>
      <footer className="creation-footer">
        <div className="creation-footer-inner">
          <button
            onClick={() => (step === 0 ? close() : setStep(step - 1))}
            disabled={busy}
          >
            {step > 0 && <ArrowLeft size={13} />}{" "}
            {step === 0 ? "Cancelar" : "Voltar"}
          </button>
          <div>
            <button
              className="quiet-button"
              onClick={() => save("Rascunho")}
              disabled={busy}
            >
              Salvar rascunho
            </button>
            <RichButton
              color="blue"
              disabled={busy}
              onClick={() =>
                step < 2
                  ? setStep(step + 1)
                  : save(
                      initial.status === "Publicado"
                        ? "Publicado"
                        : "Planejado",
                    )
              }
            >
              {step === 2 ? (
                <CalendarDays size={15} />
              ) : (
                <ChevronRight size={15} />
              )}{" "}
              {busy
                ? "Salvando…"
                : step === 0
                  ? "Próximo: arquivos"
                  : step === 1
                    ? "Próximo: agendamento"
                    : initial.status === "Publicado"
                      ? "Salvar alterações"
                      : "Planejar postagem"}
            </RichButton>
          </div>
        </div>
      </footer>
    </div>
  );
}
