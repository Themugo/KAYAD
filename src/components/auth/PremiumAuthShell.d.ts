import type { ReactNode } from 'react';

export interface AuthRail {
  title: string;
  steps: Array<{ title: string; body: string }>;
  note?: string;
}

export interface PremiumAuthShellProps {
  mode?: 'signin' | 'register';
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  rail?: AuthRail;
  headerAction?: { to?: string; prompt?: string; label?: string };
}

export default function PremiumAuthShell(props: PremiumAuthShellProps): JSX.Element;
