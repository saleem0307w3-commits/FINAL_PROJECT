"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  HelpCircle,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  UserPlus,
  Workflow,
} from "lucide-react";

import { GatedButton } from "@/components/ui/gated-button";
import { Input } from "@/components/ui/input";
import { useCan } from "@/hooks/use-can";
import type { FlowRow } from "@/lib/flows/types";

interface TemplateSummary {
  slug: string;
  name: string;
  description: string;
  icon: "MessageSquare" | "HelpCircle" | "UserPlus";
  trigger_type: string;
  node_count: number;
}

const TEMPLATE_ICONS = {
  MessageSquare,
  HelpCircle,
  UserPlus,
} as const;

export function FlowCreateScreen() {
  const router = useRouter();
  const canCreate = useCan("send-messages");
  const t = useTranslations("Flows.list");
  const te = useTranslations("Flows.edit");
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/flows/templates");
        if (!res.ok) return;
        const json = (await res.json()) as { templates: TemplateSummary[] };
        if (!cancelled) setTemplates(json.templates ?? []);
      } catch (err) {
        if (!cancelled) console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createFlow(
    body: Record<string, unknown>,
    key: string,
    fallbackError: string,
  ) {
    if (!canCreate) return;
    setBusy(key);
    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        flow?: FlowRow;
        error?: string;
      };
      if (!res.ok || !json.flow) {
        throw new Error(json.error ?? fallbackError);
      }
      router.replace(`/flows/${json.flow.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : fallbackError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-card/80 px-4 py-3.5 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => router.push("/flows")}
          aria-label={te("backToFlows")}
          title={te("backToFlows")}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Workflow className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-foreground">
            {t("createTitle")}
          </h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {t("createDesc")}
          </p>
        </div>
        <span className="ml-auto hidden shrink-0 items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300 sm:inline-flex">
          {t("beta")}
        </span>
      </header>

      <div className="relative flex-1 overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:22px_22px] opacity-60" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {t("startTemplate")}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const Icon = TEMPLATE_ICONS[template.icon] ?? FileText;
              const active = busy === template.slug;
              return (
                <button
                  key={template.slug}
                  type="button"
                  disabled={!canCreate || busy !== null}
                  title={
                    !canCreate ? "Read-only — your role can't create flows" : undefined
                  }
                  onClick={() =>
                    void createFlow(
                      { template_slug: template.slug },
                      template.slug,
                      t("cloneError"),
                    )
                  }
                  className="group flex min-h-[170px] flex-col rounded-2xl border border-border bg-card/90 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    {active ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <span className="mt-4 text-sm font-semibold text-foreground">
                    {template.name}
                  </span>
                  <span className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {template.description}
                  </span>
                  <span className="mt-auto border-t border-border pt-3 text-[11px] text-muted-foreground">
                    {t("nodeCount", { count: template.node_count })}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-card/90 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("startBlank")}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("placeholderName")}
                disabled={busy !== null}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    void createFlow(
                      {
                        name: name.trim(),
                        trigger_type: "keyword",
                        trigger_config: { keywords: [] },
                      },
                      "blank",
                      t("createError"),
                    );
                  }
                }}
                className="h-11 flex-1 bg-background"
              />
              <GatedButton
                canAct={canCreate}
                disabled={!name.trim() || busy !== null}
                onClick={() =>
                  void createFlow(
                    {
                      name: name.trim(),
                      trigger_type: "keyword",
                      trigger_config: { keywords: [] },
                    },
                    "blank",
                    t("createError"),
                  )
                }
                className="h-11 px-5"
              >
                {busy === "blank" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t("createBlank")}
              </GatedButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
