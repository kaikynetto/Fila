import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  FileText,
  FolderOpen,
  Layers2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Bell,
  Settings2,
  ArrowUpRight,
  Clock3,
  Check,
  X,
  Paperclip,
  Image,
  Upload,
  LayoutGrid,
  List,
  Globe2,
  Copy,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RichButton } from "@/components/rich-button";
import { Brand, IconButton, Media, OwnSelect, StatusBadge } from "./ui";
import Onboarding, { zoneLabel } from "./Onboarding";
import Composer from "./Composer";
import Settings from "./Settings";
import { loadWorkspace, saveWorkspace, callNative } from "./native";
import {
  accountLabel,
  accountName,
  accountOption,
  addDays,
  bytesLabel,
  longDate,
  monthDates,
  monthShift,
  newPost,
  notificationDate,
  parseDay,
  postValidation,
  profileURL,
  reminderInstant,
  reminderLabel,
  shortDate,
  todayISO,
  weekDates,
  weekLabel,
  type Attachment,
  type LoadResult,
  type NotificationStatus,
  type Post,
  type Profile,
  type Status,
  type Workspace,
} from "./domain";
import { demoWorkspace } from "./demo";

type Section =
  | "Agenda"
  | "Rascunhos"
  | "Biblioteca"
  | "Contas sociais"
  | "Preferências"
  | "Lixeira";
type Editing = { post: Post; step: number };

export default function App() {
  const [result, setResult] = useState<LoadResult | null>(null);
  const [loadError, setLoadError] = useState("");
  const [section, setSection] = useState<Section>("Agenda");
  const [day, setDay] = useState(() => todayISO());
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"agenda" | "calendar">("agenda");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [networkFilter, setNetworkFilter] = useState("Todas as contas");
  const [statusFilter, setStatusFilter] = useState("Todos os status");
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const resultRef = useRef(result);
  resultRef.current = result;
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const notify = (text: string, error = false) => setMessage({ text, error });
  const refresh = async () => {
    setLoadError("");
    try {
      const next = await loadWorkspace();
      setResult(next);
      if (next.state.profile) {
        setDay(todayISO(next.state.profile.timeZone));
        if (next.openPostId) {
          const post = next.state.posts.find((p) => p.id === next.openPostId);
          if (post) {
            setSelected(post.id);
            setDay(post.date);
          }
        }
      }
    } catch (e) {
      setLoadError((e as Error).message);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    const files = (event: Event) => {
      if (editingRef.current) return;
      const profile = resultRef.current?.state.profile;
      if (!profile) {
        notify("Conclua a configuração antes de importar arquivos.", true);
        return;
      }
      setEditing({
        post: newPost(
          profile,
          todayISO(profile.timeZone),
          (event as CustomEvent<Attachment[]>).detail,
        ),
        step: 1,
      });
    };
    const failure = (event: Event) =>
      notify((event as CustomEvent<string>).detail, true);
    const open = (event: Event) => {
      const post = resultRef.current?.state.posts.find(
        (p) => p.id === (event as CustomEvent<string>).detail,
      );
      if (post) {
        setSection("Agenda");
        setDay(post.date);
        setSelected(post.id);
        setEditing(null);
      }
    };
    const seed = async () => {
      if (!resultRef.current?.demo) return;
      try {
        const { files } = await callNative<{ files: Attachment[] }>(
          "demoFiles",
        );
        const response = await saveWorkspace(demoWorkspace(files));
        setResult(response);
        const today = todayISO(response.state.profile!.timeZone);
        setDay(today);
        setSelected(
          response.state.posts.find((p) => p.date === today)?.id || null,
        );
        setSection("Agenda");
        setEditing(null);
        notify("Exemplo carregado no espaço de demonstração.");
      } catch (e) {
        notify((e as Error).message, true);
      }
    };
    window.addEventListener("fila-files", files);
    window.addEventListener("fila-error", failure);
    window.addEventListener("fila-open-post", open);
    window.addEventListener("fila-demo-seed", seed);
    return () => {
      window.removeEventListener("fila-files", files);
      window.removeEventListener("fila-error", failure);
      window.removeEventListener("fila-open-post", open);
      window.removeEventListener("fila-demo-seed", seed);
    };
  }, []);
  const commit = async (state: Workspace) => {
    setBusy(true);
    try {
      const response = await saveWorkspace(state);
      setResult(response);
      if (response.notificationErrors?.length)
        notify(
          "A postagem foi salva, mas um lembrete não foi agendado. Confira as notificações nas preferências.",
          true,
        );
      return response;
    } finally {
      setBusy(false);
    }
  };
  const permission = (status: NotificationStatus) =>
    setResult((r) => (r ? { ...r, notifications: status } : r));
  const native = async (
    action: string,
    payload: unknown = {},
    success?: string,
  ) => {
    try {
      await callNative(action, payload);
      if (success) notify(success);
    } catch (e) {
      notify((e as Error).message, true);
    }
  };

  if (loadError)
    return (
      <div className="boot-screen">
        <h1>Não foi possível abrir o Fila.</h1>
        <p>{loadError}</p>
        <div>
          <button className="quiet-button" onClick={refresh}>
            Tentar novamente
          </button>
          <button className="quiet-button" onClick={() => native("revealData")}>
            Abrir pasta de dados
          </button>
        </div>
      </div>
    );
  if (!result)
    return (
      <div className="boot-screen">
        <Layers2 size={27} />
        <h1>Abrindo seu espaço…</h1>
      </div>
    );
  const { state, notifications, pending } = result;
  if (!state.profile)
    return (
      <Onboarding
        notificationStatus={notifications}
        onNotification={permission}
        onFinish={async (profile) => {
          const saved = await commit({ ...state, profile });
          setDay(todayISO(saved.state.profile!.timeZone));
          notify("Seu espaço está pronto. Vamos planejar a primeira postagem.");
        }}
      />
    );
  const profile = state.profile,
    today = todayISO(profile.timeZone),
    days = weekDates(day);
  const visible = state.posts
    .filter(
      (p) =>
        (networkFilter === "Todas as contas" ||
          p.accountId ===
            profile.accounts.find((a) => accountOption(a) === networkFilter)
              ?.id) &&
        (statusFilter === "Todos os status" || p.status === statusFilter) &&
        `${p.title} ${p.caption}`
          .toLocaleLowerCase("pt-BR")
          .includes(query.toLocaleLowerCase("pt-BR")),
    )
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const selectedPost = state.posts.find((p) => p.id === selected);
  const inspect =
    (section === "Agenda" || section === "Rascunhos") && selectedPost;
  const weekPosts = state.posts.filter(
    (p) => p.date >= days[0] && p.date <= days[6],
  );
  const published = weekPosts.filter((p) => p.status === "Publicado").length;
  const filesCount = new Set(
    state.posts.flatMap((p) => p.attachments.map((f) => f.id)),
  ).size;
  const upcoming = state.posts
    .map((p) => ({ post: p, date: reminderInstant(p, profile.timeZone) }))
    .filter(
      (p): p is { post: Post; date: Date } => !!p.date && p.date > new Date(),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const start = (step = 0) => setEditing({ post: newPost(profile, day), step });
  const goDay = (next: string) => {
    setDay(next);
    setSelected(visible.find((p) => p.date === next)?.id || null);
  };
  const select = (post: Post) => {
    setSelected(post.id);
  };
  const savePost = async (post: Post) => {
    await commit({
      ...state,
      posts: state.posts.some((p) => p.id === post.id)
        ? state.posts.map((p) => (p.id === post.id ? post : p))
        : [...state.posts, post],
    });
    setEditing(null);
    setSection(post.status === "Rascunho" ? "Rascunhos" : "Agenda");
    setDay(post.date);
    setSelected(post.id);
    notify(
      post.status === "Rascunho"
        ? "Rascunho salvo."
        : post.status === "Publicado"
          ? "Postagem atualizada."
          : notifications === "authorized" || post.reminderMinutes === null
            ? "Postagem planejada."
            : "Postagem planejada. Ative os lembretes nas preferências.",
    );
  };
  const updateStatus = async (post: Post, status: Status) => {
    try {
      const issue = postValidation(
        { ...post, status },
        profile,
        status === "Planejado",
      );
      if (issue) throw new Error(issue);
      await commit({
        ...state,
        posts: state.posts.map((p) =>
          p.id === post.id
            ? { ...p, status, updatedAt: new Date().toISOString() }
            : p,
        ),
      });
      notify(
        status === "Publicado"
          ? "Postagem marcada como publicada. Lembrete encerrado."
          : "Status atualizado.",
      );
    } catch (e) {
      notify((e as Error).message, true);
    }
  };
  const remove = async (post: Post) => {
    try {
      await commit({
        ...state,
        posts: state.posts.filter((p) => p.id !== post.id),
        trash: [post, ...state.trash],
      });
      setSelected(null);
      notify("Postagem movida para a lixeira.");
    } catch (e) {
      notify((e as Error).message, true);
    }
  };
  const restore = async (post: Post) => {
    try {
      await commit({
        ...state,
        posts: [
          ...state.posts,
          { ...post, status: "Rascunho", updatedAt: new Date().toISOString() },
        ],
        trash: state.trash.filter((p) => p.id !== post.id),
      });
      notify("Postagem restaurada como rascunho.");
    } catch (e) {
      notify((e as Error).message, true);
    }
  };
  if (editing)
    return (
      <>
        <Composer
          key={editing.post.id}
          profile={profile}
          initial={editing.post}
          initialStep={editing.step}
          onSave={savePost}
          onClose={() => setEditing(null)}
        />
        <Toast message={message} close={() => setMessage(null)} />
      </>
    );
  const nav: { name: Section; icon: LucideIcon; count?: number }[] = [
    { name: "Agenda", icon: CalendarDays },
    {
      name: "Rascunhos",
      icon: FileText,
      count: state.posts.filter((p) => p.status === "Rascunho").length,
    },
    { name: "Biblioteca", icon: FolderOpen, count: filesCount },
    { name: "Contas sociais", icon: Layers2, count: profile.accounts.length },
    { name: "Lixeira", icon: Trash2, count: state.trash.length },
  ];
  return (
    <div className="app-shell">
      <div className="workspace">
        <aside className="sidebar">
          <button
            className="workspace-switch"
            onClick={() => setSection("Preferências")}
          >
            <div className="workspace-avatar">
              {profile.companyName[0].toUpperCase()}
            </div>
            <div>
              <strong>{profile.companyName}</strong>
              <small>{profile.userName}</small>
            </div>
            <Settings2 size={12} />
          </button>
          <nav aria-label="Navegação principal">
            {nav.map((item) => (
              <button
                key={item.name}
                className={`nav-item ${section === item.name ? "active" : ""}`}
                onClick={() => setSection(item.name)}
              >
                <item.icon size={17} strokeWidth={1.5} />
                <span>{item.name}</span>
                {!!item.count && <small>{item.count}</small>}
              </button>
            ))}
          </nav>
          <div className="sidebar-rule" />
          <MiniCalendar day={day} onDay={goDay} />
          {weekPosts.length > 0 && (
            <div className="week-summary">
              <div>
                <span>Esta semana</span>
                <span>
                  {published} de {weekPosts.length}
                </span>
              </div>
              <div className="progress-track">
                <span
                  style={{ width: `${(published / weekPosts.length) * 100}%` }}
                />
              </div>
              <small>
                {published}{" "}
                {published === 1 ? "post publicado" : "posts publicados"}
              </small>
            </div>
          )}
          <div className="sidebar-bottom">
            <div className="sidebar-networks">
              <span>Suas contas</span>
              <div>
                {profile.accounts.slice(0, 4).map((a) => (
                  <button
                    key={a.id}
                    className="account-shortcut"
                    title={`${a.network}: ${accountLabel(a)}`}
                    onClick={() => {
                      setSection("Agenda");
                      setNetworkFilter(accountOption(a));
                      setSelected(null);
                    }}
                  >
                    <Brand network={a.network} size={15} />
                    <span>{accountName(a)}</span>
                    {a.kind === "Dark" && <small>Dark</small>}
                  </button>
                ))}
                <button
                  className="account-see-all"
                  onClick={() => setSection("Contas sociais")}
                >
                  {profile.accounts.length > 4
                    ? "Ver todas as contas"
                    : "Gerenciar contas"}
                  <ChevronRight size={11} />
                </button>
              </div>
            </div>
            <div className="sidebar-rule" />
            <button
              className={`preferences ${section === "Preferências" ? "active" : ""}`}
              onClick={() => setSection("Preferências")}
            >
              <Settings2 size={16} />
              Preferências
            </button>
          </div>
        </aside>
        <main className={`main-pane ${!inspect ? "main-wide" : ""}`}>
          <div className="page-heading">
            <div>
              <h1 className="page-title">
                {section === "Agenda" ? "Sua agenda" : section}
              </h1>
              <p>
                {section === "Agenda"
                  ? "Os próximos posts, cada um no seu tempo."
                  : section === "Rascunhos"
                    ? "Ideias em andamento, prontas para continuar."
                    : section === "Biblioteca"
                      ? "Os arquivos das suas postagens, no mesmo lugar."
                      : section === "Contas sociais"
                        ? "Os perfis que fazem parte do seu planejamento."
                        : section === "Lixeira"
                          ? "Postagens excluídas que você pode recuperar."
                          : "Seu espaço, seus perfis e os lembretes do Mac."}
              </p>
            </div>
            {["Agenda", "Rascunhos", "Biblioteca"].includes(section) && (
              <RichButton
                color="blue"
                onClick={() => start(section === "Biblioteca" ? 1 : 0)}
                disabled={busy}
                className="new-post"
              >
                <Plus size={16} />
                {section === "Biblioteca" ? "Adicionar arquivos" : "Novo post"}
              </RichButton>
            )}
          </div>
          {section === "Agenda" && (
            <>
              <div className="week-controls">
                <div className="week-title">
                  {mode === "agenda"
                    ? weekLabel(days)
                    : parseDay(day).toLocaleDateString("pt-BR", {
                        month: "long",
                      })}
                  <span>{parseDay(day).getFullYear()}</span>
                </div>
                <div className="week-actions">
                  <IconButton
                    icon={ChevronLeft}
                    label={
                      mode === "agenda" ? "Semana anterior" : "Mês anterior"
                    }
                    onClick={() =>
                      goDay(
                        mode === "agenda"
                          ? addDays(day, -7)
                          : monthShift(day, -1),
                      )
                    }
                  />
                  <IconButton
                    icon={ChevronRight}
                    label={mode === "agenda" ? "Próxima semana" : "Próximo mês"}
                    onClick={() =>
                      goDay(
                        mode === "agenda"
                          ? addDays(day, 7)
                          : monthShift(day, 1),
                      )
                    }
                  />
                  <button className="quiet-button" onClick={() => goDay(today)}>
                    Hoje
                  </button>
                  <div className="view-toggle">
                    <button
                      className={mode === "agenda" ? "selected" : ""}
                      onClick={() => setMode("agenda")}
                    >
                      <List size={13} />
                      Agenda
                    </button>
                    <button
                      className={mode === "calendar" ? "selected" : ""}
                      onClick={() => setMode("calendar")}
                    >
                      <LayoutGrid size={13} />
                      Mês
                    </button>
                  </div>
                </div>
              </div>
              <div className="filter-bar functional-filters">
                <OwnSelect
                  id="network-filter"
                  label="Filtrar por rede"
                  value={networkFilter}
                  options={[
                    "Todas as contas",
                    ...profile.accounts.map(accountOption),
                  ]}
                  onChange={(value) => {
                    setNetworkFilter(value);
                    setSelected(null);
                  }}
                />
                <OwnSelect
                  id="status-filter"
                  label="Filtrar por status"
                  value={statusFilter}
                  options={[
                    "Todos os status",
                    "Planejado",
                    "Rascunho",
                    "Publicado",
                  ]}
                  onChange={setStatusFilter}
                />
                <label className="agenda-search">
                  <Search size={12} />
                  <input
                    ref={search}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar post"
                    aria-label="Buscar postagem"
                  />
                </label>
                <span>
                  {visible.length} {visible.length === 1 ? "post" : "posts"}
                </span>
              </div>
              {mode === "agenda" ? (
                <>
                  <div className="date-strip">
                    {days.map((date) => {
                      const count = visible.filter(
                        (p) => p.date === date,
                      ).length;
                      return (
                        <button
                          key={date}
                          className={`day-tile ${date === day ? "selected" : ""} ${date < today ? "past" : ""}`}
                          onClick={() => goDay(date)}
                        >
                          <span className="day-name">
                            {parseDay(date)
                              .toLocaleDateString("pt-BR", { weekday: "short" })
                              .replace(".", "")}
                            {date === today && <span className="today-dot" />}
                          </span>
                          <span className="day-number">
                            {String(parseDay(date).getDate()).padStart(2, "0")}
                          </span>
                          <span className="day-count">
                            {count
                              ? `${count} ${count === 1 ? "post" : "posts"}`
                              : "Dia livre"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="agenda-scroll">
                    <DayGroup
                      date={day}
                      today={today}
                      posts={visible}
                      selected={selected}
                      profile={profile}
                      onSelect={select}
                      onNew={() => start()}
                    />
                    <DayGroup
                      date={addDays(day, 1)}
                      today={today}
                      posts={visible}
                      selected={selected}
                      profile={profile}
                      onSelect={select}
                      onNew={() => {
                        setEditing({
                          post: newPost(profile, addDays(day, 1)),
                          step: 0,
                        });
                      }}
                      secondary
                    />
                  </div>
                </>
              ) : (
                <MonthView
                  day={day}
                  today={today}
                  posts={visible}
                  selected={selected}
                  onSelect={(post) => {
                    goDay(post.date);
                    select(post);
                  }}
                  onNew={(date) =>
                    setEditing({ post: newPost(profile, date), step: 0 })
                  }
                />
              )}
              <button
                className="next-reminder"
                onClick={() => {
                  if (upcoming) {
                    goDay(upcoming.post.date);
                    select(upcoming.post);
                  } else setSection("Preferências");
                }}
              >
                <span className="reminder-icon">
                  <Bell size={17} />
                </span>
                <div>
                  <strong>
                    {notifications !== "authorized"
                      ? "Ative seus lembretes"
                      : upcoming
                        ? "Seu próximo lembrete"
                        : "Seu planejamento está em dia"}
                    <span>
                      {notifications === "authorized" && upcoming
                        ? notificationDate(upcoming.date, profile.timeZone)
                        : ""}
                    </span>
                  </strong>
                  <p>
                    {notifications !== "authorized"
                      ? "Permita as notificações nas preferências do Fila."
                      : upcoming
                        ? `${upcoming.post.title} · ${reminderLabel(upcoming.post.reminderMinutes)}`
                        : "Planeje um post para receber um aviso no Mac."}
                  </p>
                </div>
                {upcoming && (
                  <Brand network={upcoming.post.network} size={17} />
                )}
                <ChevronRight size={13} />
              </button>
              <footer className="agenda-footer">
                <span>
                  <Globe2 size={12} />
                  {zoneLabel(profile.timeZone)}
                </span>
                <span>
                  <i />
                  {
                    weekPosts.filter((p) => p.status === "Planejado").length
                  }{" "}
                  planejados<span className="dot-divider">·</span>
                  {weekPosts.filter((p) => p.status === "Rascunho").length}{" "}
                  rascunhos
                </span>
              </footer>
            </>
          )}
          {section === "Rascunhos" && (
            <div className="drafts-view">
              {state.posts.filter((p) => p.status === "Rascunho").length ? (
                state.posts
                  .filter((p) => p.status === "Rascunho")
                  .map((p) => (
                    <PostRow
                      key={p.id}
                      post={p}
                      account={profile.accounts.find(
                        (a) => a.id === p.accountId,
                      )}
                      selected={selected === p.id}
                      onSelect={() => select(p)}
                    />
                  ))
              ) : (
                <Empty
                  icon={FileText}
                  title="As próximas ideias começam aqui."
                  text="Salve uma postagem como rascunho para terminar depois."
                  action="Criar rascunho"
                  onAction={() => start()}
                />
              )}
            </div>
          )}
          {section === "Biblioteca" && (
            <Library
              posts={state.posts}
              onSelect={(post) => {
                setSection("Agenda");
                goDay(post.date);
                select(post);
              }}
              onOpen={(file) =>
                native("openFile", { storageName: file.storageName })
              }
            />
          )}
          {section === "Contas sociais" && (
            <div className="networks-page">
              {profile.accounts.map((account) => (
                <div key={account.id} className="network-card">
                  <span className="network-profile-icon">
                    <Brand network={account.network} size={28} />
                  </span>
                  <div>
                    <h2>{accountName(account)}</h2>
                    <p>
                      {account.network} · {accountLabel(account)}
                      {account.kind === "Dark" && (
                        <span className="account-kind">Dark</span>
                      )}
                    </p>
                  </div>
                  <span className="network-format">
                    {
                      state.posts.filter((p) => p.accountId === account.id)
                        .length
                    }{" "}
                    postagens
                  </span>
                  <button
                    className="quiet-button"
                    onClick={() =>
                      native("openProfile", { url: profileURL(account) })
                    }
                  >
                    <ArrowUpRight size={13} />
                    Abrir perfil
                  </button>
                </div>
              ))}
              <button
                className="quiet-button"
                onClick={() => setSection("Preferências")}
              >
                <Pencil size={13} />
                Adicionar ou editar contas
              </button>
            </div>
          )}
          {section === "Preferências" && (
            <Settings
              state={state}
              notifications={notifications}
              pending={pending}
              onSave={async (profile) => {
                await commit({ ...state, profile });
                setNetworkFilter("Todas as contas");
              }}
              onNotifications={permission}
              onMessage={notify}
            />
          )}
          {section === "Lixeira" && (
            <div className="trash-scroll">
              {state.trash.length ? (
                state.trash.map((post) => (
                  <div key={post.id} className="trash-row">
                    <Brand network={post.network} size={20} />
                    <div>
                      <strong>{post.title}</strong>
                      <small>
                        {shortDate(post.date)} · {post.time}
                      </small>
                    </div>
                    <button
                      className="quiet-button"
                      disabled={busy}
                      onClick={() => restore(post)}
                    >
                      <RotateCcw size={13} />
                      Restaurar
                    </button>
                  </div>
                ))
              ) : (
                <Empty
                  icon={Trash2}
                  title="Sua lixeira está vazia."
                  text="Postagens excluídas aparecem aqui para você recuperar."
                />
              )}
            </div>
          )}
        </main>
        {inspect && (
          <Inspector
            post={selectedPost!}
            profile={profile}
            busy={busy}
            onEdit={() => setEditing({ post: selectedPost!, step: 0 })}
            onStatus={(status) => updateStatus(selectedPost!, status)}
            onRemove={() => remove(selectedPost!)}
            onNative={native}
          />
        )}
      </div>
      <Toast message={message} close={() => setMessage(null)} />
    </div>
  );
}

function Toast({
  message,
  close,
}: {
  message: { text: string; error: boolean } | null;
  close: () => void;
}) {
  return message ? (
    <div
      className={`toast ${message.error ? "error" : ""}`}
      role={message.error ? "alert" : "status"}
    >
      <span>{message.error ? "!" : <Check size={14} />}</span>
      <p>{message.text}</p>
      <button onClick={close} aria-label="Fechar aviso">
        <X size={13} />
      </button>
    </div>
  ) : null;
}
function Empty({
  icon: Icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-day">
      <Icon size={27} strokeWidth={1.2} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="quiet-button" onClick={onAction}>
          <Plus size={14} />
          {action}
        </button>
      )}
    </div>
  );
}
function MiniCalendar({
  day,
  onDay,
}: {
  day: string;
  onDay: (date: string) => void;
}) {
  const week = weekDates(day);
  return (
    <div className="mini-calendar">
      <div className="mini-heading">
        <strong>
          {parseDay(day).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button
          aria-label="Mês anterior no calendário"
          onClick={() => onDay(monthShift(day, -1))}
        >
          <ChevronLeft size={11} />
        </button>
        <button
          aria-label="Próximo mês no calendário"
          onClick={() => onDay(monthShift(day, 1))}
        >
          <ChevronRight size={11} />
        </button>
      </div>
      <div className="mini-weekdays">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mini-dates">
        {monthDates(day).map((date, i) => (
          <button
            key={i}
            disabled={!date}
            onClick={() => date && onDay(date)}
            className={`${date === day ? "chosen" : ""} ${date && date >= week[0] && date <= week[6] ? "in-week" : ""}`}
          >
            {date ? parseDay(date).getDate() : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
function DayGroup({
  date,
  today,
  posts,
  selected,
  profile,
  onSelect,
  onNew,
  secondary = false,
}: {
  date: string;
  today: string;
  posts: Post[];
  selected: string | null;
  profile: Profile;
  onSelect: (post: Post) => void;
  onNew: () => void;
  secondary?: boolean;
}) {
  const daily = posts.filter((p) => p.date === date);
  return (
    <section className={`day-group ${secondary ? "secondary-day" : ""}`}>
      <div className="day-group-title">
        <h2>
          {date === today
            ? "Hoje"
            : date === addDays(today, 1)
              ? "Amanhã"
              : parseDay(date)
                  .toLocaleDateString("pt-BR", { weekday: "short" })
                  .replace(".", "")}
          <span>{longDate(date)}</span>
        </h2>
        <span>
          {daily.length} {daily.length === 1 ? "post" : "posts"}
        </span>
      </div>
      {daily.length ? (
        <div className="post-rows">
          {daily.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              account={profile.accounts.find((a) => a.id === post.accountId)}
              selected={selected === post.id}
              onSelect={() => onSelect(post)}
            />
          ))}
        </div>
      ) : secondary ? (
        <button className="quiet-empty" onClick={onNew}>
          <Plus size={13} />
          Planejar para {shortDate(date)}
        </button>
      ) : (
        <Empty
          icon={CalendarDays}
          title="Um dia com espaço para novas ideias."
          text={`Nenhuma postagem para ${shortDate(date)}.`}
          action="Planejar um post"
          onAction={onNew}
        />
      )}
    </section>
  );
}
function PostRow({
  post,
  selected,
  onSelect,
  account,
}: {
  post: Post;
  account?: Profile["accounts"][number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`post-row ${selected ? "selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${post.title}, ${post.network}, ${post.time}, ${post.status}`}
    >
      <div className="post-time">
        <span>{post.time}</span>
        <Clock3 size={13} />
      </div>
      <div className="post-thumbnail">
        <Media file={post.attachments[0]} compact />
      </div>
      <div className="post-row-info">
        <h3>{post.title}</h3>
        <div>
          <Brand network={post.network} size={14} />
          <span>{account ? accountName(account) : post.network}</span>
          <span className="dot-divider">·</span>
          <span>{post.format}</span>
        </div>
        <span className="file-count">
          <Paperclip size={11} />
          {post.attachments.length}{" "}
          {post.attachments.length === 1 ? "arquivo" : "arquivos"}
        </span>
      </div>
      <div className="post-row-end">
        <StatusBadge status={post.status} />
        <ChevronRight size={14} />
      </div>
    </button>
  );
}
function MonthView({
  day,
  today,
  posts,
  selected,
  onSelect,
  onNew,
}: {
  day: string;
  today: string;
  posts: Post[];
  selected: string | null;
  onSelect: (post: Post) => void;
  onNew: (date: string) => void;
}) {
  return (
    <div className="month-board">
      <div className="month-weekdays">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="month-days">
        {monthDates(day).map((date, i) => (
          <div
            key={i}
            className={`month-cell ${date === today ? "today" : ""} ${!date ? "outside" : ""}`}
          >
            <button
              className="month-date"
              disabled={!date}
              onClick={() => date && onNew(date)}
              aria-label={
                date ? `Criar postagem em ${longDate(date)}` : undefined
              }
            >
              {date ? parseDay(date).getDate() : ""}
            </button>
            {posts
              .filter((p) => p.date === date)
              .map((post) => (
                <button
                  key={post.id}
                  className={`month-post ${selected === post.id ? "selected" : ""}`}
                  onClick={() => onSelect(post)}
                >
                  <Brand network={post.network} size={10} />
                  <strong>{post.time}</strong>
                  <span>{post.title}</span>
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
function Inspector({
  post,
  profile,
  busy,
  onEdit,
  onStatus,
  onRemove,
  onNative,
}: {
  post: Post;
  profile: Profile;
  busy: boolean;
  onEdit: () => void;
  onStatus: (status: Status) => void;
  onRemove: () => void;
  onNative: (
    action: string,
    payload?: unknown,
    success?: string,
  ) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false),
    [preview, setPreview] = useState(0);
  useEffect(() => {
    setPreview(0);
    setConfirm(false);
  }, [post.id]);
  const notice = reminderInstant(post, profile.timeZone),
    account = profile.accounts.find((a) => a.id === post.accountId)!;
  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span>Detalhes do post</span>
        <IconButton icon={Pencil} label="Editar postagem" onClick={onEdit} />
      </div>
      <div className="inspector-scroll">
        <div className="inspector-title">
          <StatusBadge status={post.status} />
          <h2>{post.title}</h2>
          <div className="inspector-network">
            <Brand network={post.network} size={17} />
            <strong>{post.network}</strong>
            <span>· {post.format}</span>
            <button
              className="icon-button"
              aria-label="Abrir perfil da rede"
              onClick={() =>
                onNative("openProfile", { url: profileURL(account) })
              }
            >
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
        <div className="inspector-account-name">
          <span>Conta</span>
          <strong>{accountName(account)}</strong>
          {account.kind === "Dark" && (
            <small className="account-kind">Dark</small>
          )}
        </div>
        {post.attachments.length > 0 && (
          <div className="media-preview">
            <button
              className="preview-open"
              aria-label="Abrir arquivo da prévia"
              onClick={() =>
                onNative("openFile", {
                  storageName:
                    post.attachments[preview]?.storageName ||
                    post.attachments[0].storageName,
                })
              }
            >
              <Media file={post.attachments[preview] || post.attachments[0]} />
            </button>
            {post.attachments.length > 1 && (
              <div className="preview-tabs">
                {post.attachments.map((file, i) => (
                  <button
                    key={file.id}
                    className={i === preview ? "active" : ""}
                    onClick={() => setPreview(i)}
                    aria-label={`Ver arquivo ${i + 1}`}
                    aria-pressed={i === preview}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="detail-section">
          <div className="detail-heading">
            <CalendarDays size={14} />
            <h3>Quando postar</h3>
            <button onClick={onEdit} aria-label="Editar data e hora">
              <Pencil size={12} />
            </button>
          </div>
          <div className="date-time-fields">
            <span>
              <CalendarDays size={13} />
              {shortDate(post.date)}
            </span>
            <span>
              <Clock3 size={13} />
              {post.time}
            </span>
          </div>
          <small>{zoneLabel(profile.timeZone)}</small>
        </div>
        <div className="detail-reminder">
          <div className="detail-heading">
            <Bell size={14} />
            <h3>Lembrete no Mac</h3>
          </div>
          <div className="reminder-select">
            {reminderLabel(post.reminderMinutes)}
          </div>
          <p>
            {post.status === "Publicado"
              ? "Publicado. Lembrete encerrado."
              : post.status === "Rascunho"
                ? "O aviso será agendado quando você planejar o post."
                : notice
                  ? notificationDate(notice, profile.timeZone)
                  : "Sem aviso para esta postagem."}
          </p>
        </div>
        <div className="detail-section">
          <div className="detail-heading">
            <Paperclip size={14} />
            <h3>Arquivos</h3>
            <span className="count-badge">{post.attachments.length}</span>
            <button onClick={onEdit} aria-label="Editar arquivos">
              <Plus size={13} />
            </button>
          </div>
          {post.attachments.length ? (
            post.attachments.map((file) => (
              <div className="file-row" key={file.id}>
                <span className="file-icon">
                  <Image size={15} />
                </span>
                <button
                  className="file-name"
                  onClick={() =>
                    onNative("openFile", { storageName: file.storageName })
                  }
                >
                  <strong>{file.name}</strong>
                  <small>{bytesLabel(file.size)}</small>
                </button>
                <button
                  aria-label={`Salvar cópia de ${file.name}`}
                  onClick={() =>
                    onNative("exportFile", {
                      storageName: file.storageName,
                      name: file.name,
                    })
                  }
                >
                  <FolderOpen size={13} />
                </button>
              </div>
            ))
          ) : (
            <p className="detail-empty">Nenhum arquivo adicionado.</p>
          )}
        </div>
        <div className="detail-section caption-section">
          <div className="detail-heading">
            <FileText size={14} />
            <h3>Legenda</h3>
            <button
              aria-label="Copiar legenda"
              disabled={!post.caption}
              onClick={() =>
                onNative("copyText", { text: post.caption }, "Legenda copiada.")
              }
            >
              <Copy size={13} />
            </button>
          </div>
          <p className="real-caption">
            {post.caption || "Esta postagem ainda não tem legenda."}
          </p>
        </div>
        <div className="detail-section status-change">
          <label htmlFor="post-status">Status da postagem</label>
          <OwnSelect
            id="post-status"
            label="Status da postagem"
            value={post.status}
            options={["Planejado", "Rascunho", "Publicado"]}
            onChange={(value) => onStatus(value as Status)}
          />
        </div>
        <button
          className="delete-post"
          onClick={() => setConfirm(!confirm)}
          disabled={busy}
        >
          <Trash2 size={13} />
          Mover para a lixeira
        </button>
        {confirm && (
          <div className="delete-confirm">
            <p>A postagem pode ser restaurada depois.</p>
            <button className="quiet-button" onClick={onRemove} disabled={busy}>
              Mover para a lixeira
            </button>
            <button className="quiet-button" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
          </div>
        )}
      </div>
      <div className="inspector-footer">
        <Check size={13} />
        {post.status === "Publicado"
          ? "Postagem publicada"
          : post.status === "Rascunho"
            ? "Continue quando a ideia estiver pronta"
            : "Postagem salva e planejada"}
      </div>
    </aside>
  );
}
function Library({
  posts,
  onSelect,
  onOpen,
}: {
  posts: Post[];
  onSelect: (post: Post) => void;
  onOpen: (file: Attachment) => void;
}) {
  const groups = posts.filter((p) => p.attachments.length);
  return groups.length ? (
    <div className="library-grid">
      {groups.map((post) => (
        <div className="library-item" key={post.id}>
          <button
            className="library-preview"
            aria-label={`Abrir ${post.attachments[0].name}`}
            onClick={() => onOpen(post.attachments[0])}
          >
            <Media file={post.attachments[0]} />
          </button>
          <div>
            <button onClick={() => onSelect(post)}>
              <h3>{post.title}</h3>
            </button>
            <span>
              <Brand network={post.network} size={13} />
              {post.attachments.length}{" "}
              {post.attachments.length === 1 ? "arquivo" : "arquivos"}
              <span>{shortDate(post.date)}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Empty
      icon={FolderOpen}
      title="Um lugar para os arquivos dos seus posts."
      text="Adicione arquivos a uma postagem para encontrá-los aqui."
    />
  );
}
