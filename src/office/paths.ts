import { ROUTE_OF } from '../lib/routes';

export const calcPath = (draftId?: string) => (draftId ? `${ROUTE_OF.office}/calc/${draftId}` : `${ROUTE_OF.office}/calc`);
export const writerPath = (draftId?: string) => (draftId ? `${ROUTE_OF.office}/writer/${draftId}` : `${ROUTE_OF.office}/writer`);
