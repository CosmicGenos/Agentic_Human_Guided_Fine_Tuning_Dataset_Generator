import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMissingStages } from '@/features/model-config/queries';
import { useProject } from '@/features/projects/queries';
import { useStartProcessing } from '../queries';

interface StartProcessingButtonProps extends Pick<ComponentProps<typeof Button>, 'variant' | 'size'> {
  projectId: string;
  /** Omit to process everything that is uploaded or failed. */
  documentIds?: string[];
  label: string;
  disabled?: boolean;
}

export function StartProcessingButton({ projectId, documentIds, label, disabled, variant, size }: StartProcessingButtonProps) {
  const navigate = useNavigate();
  const project = useProject(projectId);
  const { missing } = useMissingStages(projectId, project.data?.data_type);
  const start = useStartProcessing(projectId);
  const blocked = missing.length > 0;

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || blocked}
      loading={start.isPending}
      title={blocked ? 'Choose the project’s models first' : undefined}
      onClick={() =>
        start.mutate(documentIds, {
          onSuccess: (job) => navigate(`/app/projects/${projectId}/processing?job=${job.id}`),
        })
      }
    >
      <Play /> {label}
    </Button>
  );
}
