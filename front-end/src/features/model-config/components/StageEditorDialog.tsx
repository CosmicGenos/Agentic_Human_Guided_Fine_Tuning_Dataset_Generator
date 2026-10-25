import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FormField } from '@/components/shared/form-field';
import { useCredentialOptions, useModelOptions } from '@/features/credentials/queries';
import { PROVIDER_LABEL } from '@/features/credentials/types';
import type { ModelStage } from '@/features/credentials/types';
import { useSaveModelConfig, useValidateModelConfig } from '../queries';
import { STAGE_INFO } from '../types';
import type { StageModel } from '../types';

const CUSTOM = '__custom__';

interface StageEditorDialogProps {
  projectId: string;
  stage: ModelStage;
  current?: StageModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StageEditorDialog({ projectId, stage, current, open, onOpenChange }: StageEditorDialogProps) {
  // Remount the body each time the dialog opens so state starts from the current assignment.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <StageEditorBody projectId={projectId} stage={stage} current={current} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function StageEditorBody({ projectId, stage, current, onClose }: Omit<StageEditorDialogProps, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const info = STAGE_INFO[stage];
  const credentials = useCredentialOptions();
  const [credentialId, setCredentialId] = useState<string | null>(current?.credential_id ?? null);
  const [modelName, setModelName] = useState<string>(current?.model_name ?? '');
  const [custom, setCustom] = useState(false);

  const models = useModelOptions(credentialId, stage);
  const validate = useValidateModelConfig(projectId);
  const save = useSaveModelConfig(projectId);

  const assignment = credentialId && modelName.trim() ? { [stage]: { credential_id: credentialId, model_name: modelName.trim() } } : null;
  const known = models.data?.models.some((m) => m.name === modelName);
  const selectValue = custom ? CUSTOM : known ? modelName : '';
  const result = validate.data?.results[0];

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{info?.label ?? stage}</DialogTitle>
        <DialogDescription>{info?.description}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <FormField label="Connection" htmlFor="stage-credential">
          {credentials.isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : credentials.data && credentials.data.length > 0 ? (
            <Select
              value={credentialId ?? ''}
              onValueChange={(id) => {
                setCredentialId(id);
                setModelName('');
                setCustom(false);
                validate.reset();
              }}
            >
              <SelectTrigger id="stage-credential" className="w-full"><SelectValue placeholder="Choose a connection" /></SelectTrigger>
              <SelectContent>
                {credentials.data.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} <span className="text-muted-foreground">· {PROVIDER_LABEL[c.provider]}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Alert><AlertDescription>No connections exist yet. An admin needs to add one under Credentials.</AlertDescription></Alert>
          )}
        </FormField>

        {credentialId && (
          <FormField label="Model" htmlFor="stage-model">
            {models.isPending ? (
              <Skeleton className="h-10 w-full" />
            ) : models.isError ? (
              <p role="alert" className="text-sm text-destructive">{models.error.message}</p>
            ) : (
              <div className="grid gap-2">
                <Select
                  value={selectValue}
                  onValueChange={(v) => {
                    validate.reset();
                    if (v === CUSTOM) { setCustom(true); setModelName(''); }
                    else { setCustom(false); setModelName(v); }
                  }}
                >
                  <SelectTrigger id="stage-model" className="w-full"><SelectValue placeholder="Choose a model" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {models.data.models.map((m) => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.name}
                        {m.embedding_dim ? <span className="text-muted-foreground"> · {m.embedding_dim} dims</span> : null}
                      </SelectItem>
                    ))}
                    {models.data.allow_custom && <SelectItem value={CUSTOM}>Other… (type a model name)</SelectItem>}
                  </SelectContent>
                </Select>

                {custom && (
                  <Input
                    autoFocus
                    placeholder="exact model name"
                    value={modelName}
                    onChange={(e) => { setModelName(e.target.value); validate.reset(); }}
                  />
                )}

                {models.data.models.length === 0 && !models.data.allow_custom && (
                  <p className="text-xs text-muted-foreground">
                    No suitable models are registered on this connection. Ask an admin to register one under Credentials.
                  </p>
                )}
                {models.data.warning && <p className="text-xs text-amber-fg">{models.data.warning}</p>}
                {models.data.allow_custom && !models.data.provider_checked && (
                  <p className="text-xs text-muted-foreground">The list comes from a built-in catalog. The model is test-called when you save.</p>
                )}
              </div>
            )}
          </FormField>
        )}

        {result && (
          <div
            role="status"
            className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${result.ok ? 'bg-sage/12 text-sage-fg' : 'bg-clay/12 text-clay-fg'}`}
          >
            {result.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
            <span>
              {result.ok
                ? `Works${result.embedding_dim ? ` · ${result.embedding_dim}-dimension vectors` : ''}.`
                : (result.error ?? 'The test call failed.')}
            </span>
          </div>
        )}
        {validate.isError && <p role="alert" className="text-sm text-destructive">{validate.error.message}</p>}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="outline"
          disabled={!assignment}
          loading={validate.isPending}
          onClick={() => assignment && validate.mutate(assignment)}
        >
          Test
        </Button>
        <Button
          disabled={!assignment}
          loading={save.isPending}
          onClick={() => assignment && save.mutate(assignment, { onSuccess: onClose })}
        >
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
