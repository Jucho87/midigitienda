import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface CanProps {
  I: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ I, children, fallback = null }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(I)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
