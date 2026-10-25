import { useState } from 'react';
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FormField } from '@/components/shared/form-field';
import { useCreateCredential, useProviderSchemas, useUpdateCredential } from '../queries';
import { fieldLabel } from '../types';
import type { Credential, Provider, ProviderSchema } from '../types';

interface CredentialFormDialogProps {
  /** Edit this credential; omit to create a new one. */
  credential?: Credential;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Creating: render the "Add connection" trigger button. */
  trigger?: ReactNode;
}

export function CredentialFormDialog({ credential, open, onOpenChange, trigger }: CredentialFormDialogProps) {
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const schemas = useProviderSchemas();

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!credential && (trigger ?? <DialogTrigger asChild><Button><Plus /> Add connection</Button></DialogTrigger>)}
      {isOpen && (
        <DialogContent>
          {schemas.isPending ? (
            <div className="grid gap-3"><DialogTitle>Loading…</DialogTitle><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          ) : schemas.isError ? (
            <p role="alert" className="text-sm text-destructive">{schemas.error.message}</p>
          ) : (
            <FormBody schemas={schemas.data} credential={credential} onClose={() => setOpen(false)} />
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}

function FormBody({ schemas, credential, onClose }: { schemas: ProviderSchema[]; credential?: Credential; onClose: () => void }) {
  const editing = !!credential;
  const create = useCreateCredential();
  const update = useUpdateCredential(credential?.id ?? '');

  const [provider, setProvider] = useState<Provider | ''>(credential?.provider ?? '');
  const [name, setName] = useState(credential?.name ?? '');
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Record<string, string>>(credential?.settings ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const schema = schemas.find((s) => s.provider === provider);
  const secretFields = schema ? [...schema.secret_fields, ...schema.optional_secret_fields] : [];
  const settingValue = (f: string) => settings[f] ?? schema?.default_settings[f] ?? '';

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!name.trim()) e['name'] = 'Give this connection a name';
    if (!schema) { e['provider'] = 'Choose a provider'; return e; }

    const anySecret = Object.values(secrets).some((v) => v.trim());
    for (const f of schema.secret_fields) {
      // on edit, secrets are replaced as a set: blank everywhere = keep, otherwise all required ones are needed
      if ((!editing || anySecret) && !secrets[f]?.trim()) e[`secret:${f}`] = `${fieldLabel(f)} is required`;
    }
    for (const f of schema.settings_fields) {
      const v = settingValue(f).trim();
      if (!v) e[`setting:${f}`] = `${fieldLabel(f)} is required`;
      else if ((f === 'base_url' || f === 'endpoint') && !/^https?:\/\//i.test(v)) e[`setting:${f}`] = 'Must start with http:// or https://';
    }
    return e;
  }

  function submit() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !schema) return;

    const filledSecrets = Object.fromEntries(Object.entries(secrets).filter(([, v]) => v.trim()));
    const allSettings = Object.fromEntries(schema.settings_fields.map((f) => [f, settingValue(f).trim()]));

    if (credential) {
      update.mutate(
        {
          name: name.trim(),
          settings: schema.settings_fields.length ? allSettings : undefined,
          secrets: Object.keys(filledSecrets).length ? filledSecrets : undefined,
        },
        { onSuccess: onClose },
      );
    } else {
      create.mutate({ name: name.trim(), provider: schema.provider, secrets: filledSecrets, settings: allSettings }, { onSuccess: onClose });
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
    >
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit connection' : 'Add a connection'}</DialogTitle>
        <DialogDescription>
          A connection links Luman to one AI provider. Secrets are encrypted and never shown again; projects pick up changes automatically.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Provider" htmlFor="cred-provider" error={errors['provider']}>
        {editing ? (
          <p className="text-sm font-medium">{schema?.label}</p>
        ) : (
          <Select value={provider} onValueChange={(v) => { setProvider(v as Provider); setSecrets({}); setSettings({}); setErrors({}); }}>
            <SelectTrigger id="cred-provider" className="w-full"><SelectValue placeholder="Choose a provider" /></SelectTrigger>
            <SelectContent>
              {schemas.map((s) => <SelectItem key={s.provider} value={s.provider}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </FormField>

      {schema && (
        <>
          <FormField label="Name" htmlFor="cred-name" error={errors['name']} hint="Shown to project owners when they pick a connection, e.g. “OpenAI team key”." required>
            <Input id="cred-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors['name']} autoFocus />
          </FormField>

          {secretFields.map((f) => {
            const optional = schema.optional_secret_fields.includes(f);
            const stored = credential?.secrets_present.includes(f);
            return (
              <FormField
                key={f}
                label={`${fieldLabel(f)}${optional ? ' (optional)' : ''}`}
                htmlFor={`cred-secret-${f}`}
                error={errors[`secret:${f}`]}
                hint={stored ? 'A value is stored. Leave blank to keep it.' : optional ? 'Only needed behind an authenticating proxy.' : undefined}
                required={!optional && !editing}
              >
                <PasswordInput
                  id={`cred-secret-${f}`}
                  autoComplete="off"
                  value={secrets[f] ?? ''}
                  onChange={(e) => setSecrets((s) => ({ ...s, [f]: e.target.value }))}
                  aria-invalid={!!errors[`secret:${f}`]}
                  placeholder={stored ? '••••••••' : undefined}
                />
              </FormField>
            );
          })}

          {schema.settings_fields.map((f) => (
            <FormField key={f} label={fieldLabel(f)} htmlFor={`cred-setting-${f}`} error={errors[`setting:${f}`]} required>
              <Input
                id={`cred-setting-${f}`}
                value={settingValue(f)}
                onChange={(e) => setSettings((s) => ({ ...s, [f]: e.target.value }))}
                aria-invalid={!!errors[`setting:${f}`]}
                placeholder={f === 'endpoint' ? 'https://your-resource.openai.azure.com' : undefined}
              />
            </FormField>
          ))}
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!schema} loading={pending}>{editing ? 'Save changes' : 'Add connection'}</Button>
      </DialogFooter>
    </form>
  );
}
