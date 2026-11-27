'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, KeyRound, Loader2, RefreshCw, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CHILD_AGENT_ROLES,
  generateAgentPassword,
  normalizeAgentEmail,
  normalizeAgentName,
  type ChildAgentRole,
} from '@/lib/auth/child-agents';

interface CreatedAgent {
  name: string;
  email: string;
  password: string;
  role: ChildAgentRole;
}

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateAgentDialogProps) {
  const t = useTranslations('Settings.createAgent');
  const tRoles = useTranslations('Settings.roles');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ChildAgentRole>('agent');
  const [password, setPassword] = useState(() => generateAgentPassword());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreatedAgent | null>(null);

  function reset() {
    setName('');
    setEmail('');
    setRole('agent');
    setPassword(generateAgentPassword());
    setSubmitting(false);
    setResult(null);
  }

  async function handleCreate() {
    const cleanName = normalizeAgentName(name);
    const cleanEmail = normalizeAgentEmail(email);

    if (!cleanName) {
      toast.error(t('invalidName'));
      return;
    }
    if (!cleanEmail) {
      toast.error(t('invalidEmail'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/account/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          role,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || t('networkError'));
        return;
      }

      const data = (await res.json()) as CreatedAgent;
      setResult(data);
      toast.success(t('createdToast', { name: data.name, role: tRoles(data.role) }));
      onCreated();
    } catch (err) {
      console.error('[CreateAgentDialog] create error:', err);
      toast.error(t('networkError'));
    } finally {
      setSubmitting(false);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('copied'));
    } catch {
      toast.error(t('networkError'));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="bg-popover border-border sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <UserPlus className="size-4 text-primary" />
                {t('createdTitle')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t('createdDesc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('emailLabelShort')}</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={result.email}
                    className="bg-muted border-border text-foreground"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copy(result.email)}
                    className="shrink-0 border-border text-muted-foreground hover:bg-muted"
                  >
                    <Copy className="size-4" />
                    {t('copyEmail')}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('passwordLabel')}</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={result.password}
                    className="bg-muted border-border text-foreground font-mono text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copy(result.password)}
                    className="shrink-0 border-border text-muted-foreground hover:bg-muted"
                  >
                    <Copy className="size-4" />
                    {t('copyPassword')}
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                <strong className="font-semibold text-amber-100">
                  {t('savePasswordNow')}
                </strong>{' '}
                {t('savePasswordHint')}
              </div>
            </div>

            <DialogFooter className="bg-popover border-border">
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {t('done')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-popover-foreground">
                {t('dialogTitle')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t('dialogDesc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('nameLabel')}</Label>
                <Input
                  placeholder={t('namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('emailLabel')}</Label>
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('roleLabel')}</Label>
                <Select
                  value={role}
                  onValueChange={(v) => v && setRole(v as ChildAgentRole)}
                >
                  <SelectTrigger className="w-full bg-muted border-border text-foreground">
                    <SelectValue>{tRoles(role)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CHILD_AGENT_ROLES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {tRoles(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {tRoles(`${role}Hint` as 'adminHint' | 'agentHint' | 'viewerHint')}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('passwordLabel')}</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={password}
                    className="bg-muted border-border text-foreground font-mono text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPassword(generateAgentPassword())}
                    className="shrink-0 border-border text-muted-foreground hover:bg-muted"
                    title={t('regenerate')}
                    aria-label={t('regenerate')}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
              </div>
            </div>

            <DialogFooter className="bg-popover border-border">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border text-muted-foreground hover:bg-muted"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    {t('create')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
