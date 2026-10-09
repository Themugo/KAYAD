import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginPathFor } from '../utils/authIntent';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLogin?: (user: unknown) => void;
}

/**
 * Compatibility shim. KAYAD has one canonical sign-in surface: `/login`
 * (and `/register`). This component used to host a second, divergent sign-in
 * form; it now only forwards to the canonical page, preserving the current
 * location as the validated return destination. It renders nothing.
 */
export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!isOpen) return;
    onClose?.();
    navigate(loginPathFor(location));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  return null;
};

export default AuthModal;
