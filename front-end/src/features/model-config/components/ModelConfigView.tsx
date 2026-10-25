import { useState } from 'react';
import { Lock, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { Panel } from '@/components/layout/Panel';
import { PROVIDER_LABEL } from '@/features/credentials/types';
import type { ModelStage } from '@/features/credentials/types';
import { useProjectAccess } from '@/features/members/use-project-access';
import { useProject } from '@/features/projects/queries';
import { useModelConfig, useRemoveStage } from '../queries';
import { ACTIVE_STAGES, STAGE_INFO, requiredStages } from '../types';
import type { StageModel } from '../types';
import { StageEditorDialog } from './StageEditorDialog';

export function ModelConfigView({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const config = useModelConfig(projectId);
  const { isOwner } = useProjectAccess(projectId);
  const removeStage = useRemoveStage(projectId);
  const [editing, setEditing] = useState<ModelStage | null>(null);
  const [removing, setRemoving] = useState<ModelStage | null>(null);

  const dataType = project.data?.data_type;
  const required = dataType ? requiredStages(dataType) : [];

  return (
    <>
      <Panel
        flush
        title="Models"
        description={isOwner ? 'Choose which model does each job in this project. Each choice is test-called before it is saved.' : 'Only owners can change the models.'}
      >
        <QueryBoundary query={config}>
          {(data) => {
            const byStage = new Map(data.stages.map((s) => [s.stage, s]));
            // vision only matters for academic projects, unless one is already set
            const stages = ACTIVE_STAGES.filter((s) => s !== 'vision' || dataType === 'academic' || byStage.has(s));

            return (
              <>
                {data.embedding_locked && (
                  <Alert className="m-4">
                    <Lock />
                    <AlertDescription>
                      The embedder is locked because documents have already been processed with it; changing it would make the stored vectors useless.
                    </AlertDescription>
                  </Alert>
                )}

                <ul className="divide-y divide-border">
                  {stages.map((stage) => {
                    const current: StageModel | undefined = byStage.get(stage);
                    const locked = stage === 'embedder' && data.embedding_locked;
                    return (
                      <li key={stage} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div className="min-w-0 sm:max-w-xl">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium">{STAGE_INFO[stage]?.label ?? stage}</h3>
                            {required.includes(stage) && <Badge variant={current ? 'neutral' : 'warning'}>Required</Badge>}
                            {locked && <Lock className="size-3.5 text-muted-foreground" aria-label="Locked" />}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{STAGE_INFO[stage]?.description}</p>
                          {current ? (
                            <p className="mt-2 text-sm">
                              <span className="font-mono">{current.model_name}</span>
                              <span className="text-muted-foreground">
                                {' '}· {current.credential_name} ({PROVIDER_LABEL[current.provider]})
                                {current.embedding_dim ? ` · ${current.embedding_dim} dims` : ''}
                              </span>
                            </p>
                          ) : (
                            <p className="mt-2 text-sm text-muted-foreground">Not set</p>
                          )}
                        </div>

                        {isOwner && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="outline" size="sm" disabled={locked} onClick={() => setEditing(stage)}>
                              {current ? 'Change' : 'Choose model'}
                            </Button>
                            {current && !locked && (
                              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${STAGE_INFO[stage]?.label ?? stage}`} onClick={() => setRemoving(stage)}>
                                <Trash2 />
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            );
          }}
        </QueryBoundary>
      </Panel>

      {editing && (
        <StageEditorDialog
          projectId={projectId}
          stage={editing}
          current={config.data?.stages.find((s) => s.stage === editing)}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove this model?"
        description="Processing needs the required models, so you’ll have to choose one again before processing more documents."
        confirmLabel="Remove"
        destructive
        pending={removeStage.isPending}
        onConfirm={() => removeStage.mutateAsync(removing!)}
      />
    </>
  );
}
