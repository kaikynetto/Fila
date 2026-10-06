import test from "node:test";
import assert from "node:assert/strict";
import {
  monthDates,
  weekDates,
  addDays,
  scheduledInstant,
  reminderInstant,
  profileURL,
  postValidation,
  type Profile,
  type Post,
} from "./domain.ts";

const profile: Profile = {
  userName: "Ana",
  companyName: "Lume",
  timeZone: "America/Sao_Paulo",
  accounts: [
    {
      id: "00000000-0000-0000-0000-000000000001",
      network: "Instagram",
      handle: "@studiolume",
    },
  ],
};
const post: Post = {
  id: "00000000-0000-0000-0000-000000000002",
  title: "Bastidores",
  accountId: profile.accounts[0].id,
  network: "Instagram",
  format: "Post",
  caption: "",
  date: "2027-01-01",
  time: "00:05",
  reminderMinutes: 15,
  status: "Planejado",
  attachments: [],
  createdAt: "2026-10-06T00:00:00Z",
  updatedAt: "2026-10-06T00:00:00Z",
};

test("a semana atravessa mês e ano sem perder dias", () => {
  assert.deepEqual(weekDates("2027-01-01"), [
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("o calendário suporta meses com seis linhas e anos bissextos", () => {
  const may = monthDates("2026-03-01");
  assert.equal(may.length, 42);
  assert.equal(may.filter(Boolean).length, 31);
  assert.ok(monthDates("2028-02-01").includes("2028-02-29"));
});
test("o horário usa o fuso do perfil, não o fuso da máquina", () => {
  assert.equal(
    scheduledInstant(post, profile.timeZone)?.toISOString(),
    "2027-01-01T03:05:00.000Z",
  );
  assert.equal(
    scheduledInstant(post, "UTC")?.toISOString(),
    "2027-01-01T00:05:00.000Z",
  );
});
test("o lembrete pode cair no dia anterior e é cancelado ao publicar", () => {
  assert.equal(
    reminderInstant(post, profile.timeZone)?.toISOString(),
    "2027-01-01T02:50:00.000Z",
  );
  assert.equal(
    reminderInstant({ ...post, status: "Publicado" }, profile.timeZone),
    null,
  );
  assert.equal(
    reminderInstant({ ...post, reminderMinutes: null }, profile.timeZone),
    null,
  );
});
test("datas impossíveis e horários fora do intervalo são rejeitados", () => {
  assert.equal(scheduledInstant({ ...post, date: "2027-02-31" }, "UTC"), null);
  assert.equal(scheduledInstant({ ...post, time: "24:00" }, "UTC"), null);
  assert.equal(
    scheduledInstant(
      { ...post, date: "2027-03-28", time: "01:30" },
      "Europe/Lisbon",
    ),
    null,
  );
});
test("planejar no passado falha mas salvar um rascunho continua permitido", () => {
  assert.match(
    postValidation(post, profile, true, new Date("2028-01-01")) || "",
    /futuro/,
  );
  assert.equal(
    postValidation(post, profile, false, new Date("2028-01-01")),
    null,
  );
  assert.match(
    postValidation({ ...post, title: " " }, profile, false) || "",
    /título/,
  );
});
test("links dos perfis removem query strings e não aceitam esquemas de execução", () => {
  assert.equal(
    profileURL(profile.accounts[0]),
    "https://www.instagram.com/studiolume",
  );
  assert.equal(
    profileURL({
      ...profile.accounts[0],
      handle: "https://instagram.com/studiolume?token=abc",
    }),
    "https://instagram.com/studiolume",
  );
  assert.ok(
    profileURL({
      ...profile.accounts[0],
      handle: "javascript:alert(1)",
    }).startsWith("https://www.instagram.com/"),
  );
});
