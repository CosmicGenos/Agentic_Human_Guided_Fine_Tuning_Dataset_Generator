import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/shared/form-field';
import { useRegisterModel } from '../queries';
import type { ModelCapability, Provider } from '../types';

const CAPABILITIES: { value: ModelCapability; label: string }[] = [
  { value: 'chat', label: 'Chat' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'vision', label: 'Vision' },
  { value: 'rerank', label: 'Rerank' },
];

export function RegisterModelDialog({ credentialId, provider }: { credentialId: string; provider: Provider }) {
  const [open, setOpen] = useState(false);
  const register = useRegisterModel(credentialId);
  const isAzure = provider === 'azure_openai';

  const [name, setName] = useState('');
  const [baseModel, setBaseModel] = useState('');
  const [capabilities, setCapabilities] = useState<ModelCapability[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(''); setBaseModel(''); setCapabilities([]); setError(null);
  }

  function submit() {
    if (!name.trim()) { setError(isAzure ? 'Enter the deployment name' : 'Enter the model name'); return; }
    register.mutate(
      {
        name: name.trim(),
        base_model: isAzure && baseModel.trim() ? baseModel.trim() : undefined,
        capabilities: capabilities.length ? capabilities : undefined,
      },
      { onSuccess: () => { setOpen(false); reset(); } },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus /> Register model</Button>
      </DialogTrigger>
      <DialogContent>
        <form noValidate className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <DialogHeader>
            <DialogTitle>Register a model</DialogTitle>
            <DialogDescription>
              {isAzure
                ? 'Add one of your Azure deployments. It is test-called right away; a failed test is still saved so you can see why.'
                : 'Add a model that is already downloaded on your Ollama server (ollama pull <name>). It is test-called right away.'}
            </DialogDescription>
          </DialogHeader>

          <FormField label={isAzure ? 'Deployment name' : 'Model name'} htmlFor="reg-name" error={error ?? undefined} required>
            <Input id="reg-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={isAzure ? 'company-gpt4o' : 'llama3.2:3b'} aria-invalid={!!error} />
          </FormField>

          {isAzure && (
            <FormField label="Base model" htmlFor="reg-base" hint="The real model behind the deployment, e.g. gpt-4o. Used to fill in capabilities and sizes.">
              <Input id="reg-base" value={baseModel} onChange={(e) => setBaseModel(e.target.value)} placeholder="gpt-4o" />
            </FormField>
          )}

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[13px] font-medium">Capabilities</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {CAPABILITIES.map((c) => (
                <div key={c.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`cap-${c.value}`}
                    checked={capabilities.includes(c.value)}
                    onCheckedChange={(v) => setCapabilities((prev) => (v === true ? [...prev, c.value] : prev.filter((x) => x !== c.value)))}
                  />
                  <Label htmlFor={`cap-${c.value}`} className="font-normal">{c.label}</Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Leave all unchecked to detect them automatically.</p>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={register.isPending}>Register</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
