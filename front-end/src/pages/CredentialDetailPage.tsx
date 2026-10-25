import { useParams } from 'react-router-dom';
import { CredentialDetailView } from '@/features/credentials/components/CredentialDetailView';

export default function CredentialDetailPage() {
  const { credentialId } = useParams<{ credentialId: string }>();
  return <CredentialDetailView credentialId={credentialId ?? ''} />;
}
