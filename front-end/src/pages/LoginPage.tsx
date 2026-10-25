import { AuthShell } from '@/features/auth/components/AuthShell';
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" subtitle="Enter your credentials to continue" footer="Access is by invitation only.">
      <LoginForm />
    </AuthShell>
  );
}
