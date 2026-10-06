import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  Pencil,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Image,
  FileText,
  Play,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  faInstagram,
  faTiktok,
  faLinkedinIn,
  faFacebookF,
  faYoutube,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";
import { Badge } from "@/components/badge";
import type { Network, Status, Attachment } from "./domain";
import { fileURL } from "./native";
export function Brand({
  network,
  size = 16,
}: {
  network: Network;
  size?: number;
}) {
  const icon = {
    Instagram: faInstagram,
    TikTok: faTiktok,
    LinkedIn: faLinkedinIn,
    Facebook: faFacebookF,
    YouTube: faYoutube,
    X: faXTwitter,
  }[network];
  const [width, height, , , path] = icon.icon;
  return (
    <svg
      className={`brand brand-${network.toLowerCase()}`}
      width={size}
      height={size}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={network}
    >
      <path fill="currentColor" d={typeof path === "string" ? path : path[0]} />
    </svg>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className="icon-button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <Icon size={16} strokeWidth={1.6} />
    </button>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      variant={
        status === "Planejado"
          ? "green"
          : status === "Rascunho"
            ? "outline"
            : "secondary"
      }
      className={`status status-${status.toLowerCase()}`}
    >
      {status === "Publicado" ? (
        <CheckCheck size={11} />
      ) : status === "Planejado" ? (
        <Check size={11} />
      ) : (
        <Pencil size={10} />
      )}
      {status}
    </Badge>
  );
}
export function OwnSelect({
  id,
  value,
  options,
  onChange,
  label,
}: {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    container.current?.addEventListener("keydown", escape);
    const element = container.current;
    element
      ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
      ?.focus();
    return () => {
      document.removeEventListener("mousedown", outside);
      element?.removeEventListener("keydown", escape);
    };
  }, [open]);
  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div className="creation-dropdown" ref={container}>
      <button
        ref={trigger}
        id={id}
        className="creation-select-trigger"
        aria-label={`${label}: ${value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {value}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="creation-select-options"
          id={`${id}-options`}
          role="listbox"
          aria-label={label}
        >
          {options.map((option, i) => (
            <button
              key={option}
              role="option"
              aria-selected={value === option}
              tabIndex={value === option ? 0 : -1}
              onClick={() => choose(option)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const next =
                    (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
                    options.length;
                  container.current
                    ?.querySelectorAll<HTMLButtonElement>('[role="option"]')
                    [next]?.focus();
                }
                if (e.key === "Home" || e.key === "End") {
                  e.preventDefault();
                  container.current
                    ?.querySelectorAll<HTMLButtonElement>('[role="option"]')
                    [e.key === "Home" ? 0 : options.length - 1]?.focus();
                }
              }}
            >
              {option}
              {value === option && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OwnDatePicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date(`${value}T12:00:00`));
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const year = month.getFullYear(),
    monthIndex = month.getMonth();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const gridSize = Math.ceil((offset + count) / 7) * 7;
  const dateLabel = new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    const element = container.current;
    element?.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      element?.removeEventListener("keydown", escape);
    };
  }, [open]);
  const choose = (day: number) => {
    onChange(
      `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div className="creation-date-picker" ref={container}>
      <button
        className="creation-date-trigger"
        id={id}
        ref={trigger}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Dia da postagem: ${dateLabel}`}
      >
        <CalendarDays size={15} />
        {dateLabel}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="creation-calendar"
          role="dialog"
          aria-label="Escolher o dia da postagem"
        >
          <div className="creation-calendar-header">
            <button
              aria-label="Mês anterior"
              onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
            >
              <ChevronLeft size={15} />
            </button>
            <strong>
              {month.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <button
              aria-label="Próximo mês"
              onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="creation-calendar-weekdays">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="creation-calendar-days">
            {Array.from({ length: gridSize }, (_, i) => i - offset + 1).map(
              (d, i) => {
                const valid = d > 0 && d <= count;
                const selected =
                  valid &&
                  value ===
                    `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                return (
                  <button
                    key={i}
                    disabled={!valid}
                    className={selected ? "chosen" : ""}
                    aria-label={
                      valid
                        ? `${d} de ${month.toLocaleDateString("pt-BR", { month: "long" })}`
                        : undefined
                    }
                    aria-pressed={selected}
                    onClick={() => choose(d)}
                  >
                    {valid ? d : ""}
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Media({
  file,
  compact = false,
}: {
  file?: Attachment;
  compact?: boolean;
}) {
  const image =
    file?.thumbnail ||
    (file?.mime.startsWith("image/") ? fileURL(file) : undefined);
  return (
    <div className={`real-media ${compact ? "compact" : ""}`}>
      {image ? (
        <img src={image} alt={file?.name || ""} />
      ) : file?.mime.startsWith("video/") ? (
        <Play size={compact ? 20 : 32} />
      ) : file ? (
        <FileText size={compact ? 20 : 32} />
      ) : (
        <Image size={compact ? 20 : 32} strokeWidth={1.2} />
      )}
    </div>
  );
}
