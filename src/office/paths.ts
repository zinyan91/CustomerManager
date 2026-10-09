import { ROUTE_OF } from '../lib/routes';

export const calcPath = (draftId?: string) => (draftId ? `${ROUTE_OF.office}/calc/${draftId}` : `${ROUTE_OF.office}/calc`);
export const calcSharedPath = (sharedId: string) => `${ROUTE_OF.office}/calc/shared/${sharedId}`;
export const writerSharedPath = (sharedId: string) => `${ROUTE_OF.office}/writer/shared/${sharedId}`;
export const writerPath = (draftId?: string) => (draftId ? `${ROUTE_OF.office}/writer/${draftId}` : `${ROUTE_OF.office}/writer`);
