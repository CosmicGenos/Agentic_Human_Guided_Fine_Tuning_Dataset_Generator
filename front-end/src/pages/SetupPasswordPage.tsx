import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { SetupPasswordForm } from '@/features/auth/components/SetupPasswordForm';

/** Landing page of the invite email link: /setup-password?token=… (valid once, for 24 hours). */
export default function SetupPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  return (
    <AuthShell
      title="Finish setting up your account"
      subtitle="Choose a username and password to get started."
      footer={<Link to="/login" className="underline">Already set up? Sign in</Link>}
    >
      {token ? (
        <SetupPasswordForm token={token} />
      ) : (
        <p role="alert" className="text-sm text-cream/70">
          This link is incomplete. Open the invitation email again and use the full link, or ask an admin to resend it.
        </p>
      )}
    </AuthShell>
  );
}
