export const NETWORKS = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Facebook",
  "YouTube",
  "X",
] as const;
export type Network = (typeof NETWORKS)[number];
export type Status = "Planejado" | "Rascunho" | "Publicado";
export type Account = {
  id: string;
  network: Network;
  handle: string;
  label?: string;
  kind?: "Empresa" | "Dark";
};
export type Profile = {
  userName: string;
  companyName: string;
  timeZone: string;
  accounts: Account[];
};
export type Attachment = {
  id: string;
  name: string;
  storageName: string;
  size: number;
  mime: string;
  thumbnail?: string;
};
export type Post = {
  id: string;
  title: string;
  accountId: string;
  network: Network;
  format: string;
  caption: string;
  date: string;
  time: string;
  reminderMinutes: number | null;
  status: Status;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
};
export type Workspace = {
  version: 1;
  profile: Profile | null;
  posts: Post[];
  trash: Post[];
};
export type NotificationStatus = "authorized" | "denied" | "notDetermined";
export type LoadResult = {
  state: Workspace;
  notifications: NotificationStatus;
  pending: number;
  demo: boolean;
  openPostId?: string;
  notificationErrors?: string[];
};
export const emptyWorkspace = (): Workspace => ({
  version: 1,
  profile: null,
  posts: [],
  trash: [],
});
export const uid = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
export const REMINDERS = [
  "No horário do post",
  "5 minutos antes",
  "15 minutos antes",
  "30 minutos antes",
  "1 hora antes",
  "Sem lembrete",
];
export function reminderLabel(minutes: number | null) {
  return minutes === null
    ? "Sem lembrete"
    : minutes === 0
      ? "No horário do post"
      : minutes === 60
        ? "1 hora antes"
        : `${minutes} minutos antes`;
}
export function reminderMinutes(label: string): number | null {
  return label === "Sem lembrete"
    ? null
    : label === "No horário do post"
      ? 0
      : label === "1 hora antes"
        ? 60
        : parseInt(label, 10);
}
export function formats(network: Network) {
  return network === "Instagram"
    ? ["Reel", "Carrossel", "Post", "Story"]
    : network === "TikTok"
      ? ["Vídeo", "Carrossel"]
      : network === "YouTube"
        ? ["Vídeo", "Short"]
        : network === "Facebook"
          ? ["Post", "Vídeo", "Story"]
          : ["Post", "Carrossel"];
}
export function todayISO(timeZone = "America/Sao_Paulo", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function parseDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function dateISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(iso: string, amount: number) {
  const date = parseDay(iso);
  date.setDate(date.getDate() + amount);
  return dateISO(date);
}
export function weekDates(iso: string) {
  const date = parseDay(iso);
  const first = addDays(iso, -((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}
export function monthDates(iso: string) {
  const date = parseDay(iso);
  const year = date.getFullYear(),
    month = date.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  return Array.from({ length: Math.ceil((count + offset) / 7) * 7 }, (_, i) =>
    i >= offset && i < offset + count
      ? dateISO(new Date(year, month, i - offset + 1, 12))
      : null,
  );
}
export function monthShift(iso: string, delta: number) {
  const date = parseDay(iso);
  return dateISO(new Date(date.getFullYear(), date.getMonth() + delta, 1, 12));
}
export function longDate(iso: string) {
  return parseDay(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
export function shortDate(iso: string) {
  return parseDay(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}
export function weekLabel(days: string[]) {
  const start = parseDay(days[0]),
    end = parseDay(days[6]);
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()} – ${end.getDate()} de ${end.toLocaleDateString("pt-BR", { month: "long" })}`
    : `${shortDate(days[0])} – ${shortDate(days[6])}`;
}
export function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function scheduledInstant(
  post: Pick<Post, "date" | "time">,
  timeZone: string,
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) || !validTime(post.time))
    return null;
  const [year, month, day] = post.date.split("-").map(Number),
    [hour, minute] = post.time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let guess = desired;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
    );
    const wall = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
    );
    guess += desired - wall;
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
  );
  if (
    +parts.year !== year ||
    +parts.month !== month ||
    +parts.day !== day ||
    +parts.hour !== hour ||
    +parts.minute !== minute
  )
    return null;
  return new Date(guess);
}
export function reminderInstant(post: Post, timeZone: string) {
  const schedule = scheduledInstant(post, timeZone);
  return schedule &&
    post.reminderMinutes !== null &&
    post.status === "Planejado"
    ? new Date(schedule.getTime() - post.reminderMinutes * 60000)
    : null;
}
export function notificationDate(date: Date, timeZone: string) {
  return date.toLocaleString("pt-BR", {
    timeZone,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function postValidation(
  post: Post,
  profile: Profile,
  planning: boolean,
  now = new Date(),
): string | null {
  if (!post.title.trim()) return "Dê um título à postagem.";
  if (
    !profile.accounts.some(
      (a) => a.id === post.accountId && a.network === post.network,
    )
  )
    return "Escolha um perfil cadastrado.";
  const scheduled = scheduledInstant(post, profile.timeZone);
  if (!scheduled) return "Confira a data e o horário da postagem.";
  if (planning && scheduled <= now)
    return "Escolha um horário futuro para planejar a postagem.";
  if (!formats(post.network).includes(post.format))
    return "Escolha um formato válido para esta rede.";
  return null;
}
export function profileURL(account: Account) {
  const domains: Record<Network, string> = {
    Instagram: "instagram.com",
    TikTok: "tiktok.com",
    LinkedIn: "linkedin.com",
    Facebook: "facebook.com",
    YouTube: "youtube.com",
    X: "x.com",
  };
  const handle = account.handle.trim();
  try {
    const parsed = new URL(
      handle.startsWith("http") ? handle : `https://${handle}`,
    );
    if (parsed.hostname.replace(/^www\./, "") === domains[account.network])
      return `https://${parsed.hostname}${parsed.pathname}`;
  } catch {}
  const slug = handle.replace(/^@/, "");
  return `https://www.${domains[account.network]}/${account.network === "TikTok" || account.network === "YouTube" ? "@" : account.network === "LinkedIn" ? "company/" : ""}${encodeURIComponent(slug)}`;
}
export function accountLabel(account: Account) {
  if (account.handle.startsWith("http")) {
    try {
      return (
        new URL(account.handle).pathname.replace(/\/$/, "").split("/").pop() ||
        account.handle
      );
    } catch {}
  }
  return account.handle.startsWith("@") || account.network === "LinkedIn"
    ? account.handle
    : `@${account.handle}`;
}
export function accountName(account: Account) {
  return account.label?.trim() || account.network;
}
export function accountOption(account: Account) {
  return `${accountName(account)} · ${accountLabel(account)}`;
}
export function bytesLabel(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`
    : bytes >= 1024
      ? `${Math.ceil(bytes / 1024)} KB`
      : `${bytes} B`;
}
export function newPost(
  profile: Profile,
  date: string,
  attachments: Attachment[] = [],
): Post {
  const account = profile.accounts[0],
    now = new Date().toISOString();
  let time = "18:00";
  if (date === todayISO(profile.timeZone)) {
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: profile.timeZone,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date()),
    );
    if (hour >= 23) {
      date = addDays(date, 1);
      time = "09:00";
    } else time = `${String(Math.max(9, hour + 1)).padStart(2, "0")}:00`;
  }
  return {
    id: uid(),
    title: "",
    accountId: account.id,
    network: account.network,
    format: formats(account.network)[0],
    caption: "",
    date,
    time,
    reminderMinutes: 15,
    status: "Rascunho",
    attachments,
    createdAt: now,
    updatedAt: now,
  };
}
