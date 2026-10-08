import { ROUTE_OF } from '../lib/routes';

export const calcPath = (draftId?: string) => (draftId ? `${ROUTE_OF.office}/calc/${draftId}` : `${ROUTE_OF.office}/calc`);
