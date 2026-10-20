import { Navigate } from 'react-router';
import { useModules } from '../../context/ModulesContext';
import { legacyHubDestination } from '../../lib/workspaceNavigation';

export function LegacyHubRedirect() {
  const {allowed} = useModules();
  return <Navigate to={legacyHubDestination(allowed)} replace />;
}
