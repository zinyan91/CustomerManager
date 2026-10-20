import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { useDocumentDossierController } from '../../../hooks/useDocumentDossierController';
import { TEMPLATE_BY_ID } from '../registry/templates';
import { Field, Select } from '../../ui/Field';
import { Button } from '../../ui/Button';

export function DossierNavigation({ctrl, treeNavigation = false, leading}:{ctrl:ReturnType<typeof useDocumentDossierController>; treeNavigation?:boolean; leading?:ReactNode}) {
  const included = ctrl.visibleDocs.filter(doc=>!ctrl.isExcluded(doc.templateId));
  const index = included.findIndex(doc=>doc.templateId===ctrl.state.activeDocId);
  const optional = ctrl.visibleDocs.filter(doc=>doc.optional);
  return <div className="border-b border-line/60 bg-surface/40">
    <div className="flex flex-wrap items-end gap-3 p-3">
      {leading}
      {treeNavigation ? <div className="flex-1 min-w-0 self-center font-semibold text-ink">{ctrl.activeTemplate.label.replace(/^\d+\.\s*/, '')}</div> : <>
      <Field label="Bộ hồ sơ" htmlFor="dossier-select" className="w-full sm:w-60">
        <Select id="dossier-select" value={ctrl.state.activeDossierId} onChange={event=>ctrl.selectDossier(event.target.value)}>
          {ctrl.dossiers.map(dossier=><option key={dossier.id} value={dossier.id}>{dossier.label}</option>)}
        </Select>
      </Field>
      <Field label="Biểu mẫu" htmlFor="dossier-template-select" className="flex-1 min-w-0 w-full sm:w-auto">
        <Select id="dossier-template-select" value={ctrl.state.activeDocId} onChange={event=>ctrl.selectDoc(event.target.value)}>
          {ctrl.visibleDocs.map(doc=><option key={doc.templateId} value={doc.templateId}>
            {TEMPLATE_BY_ID[doc.templateId]?.label ?? doc.templateId}
          </option>)}
        </Select>
      </Field>
      </>}
      <div className="flex gap-1">
        <Button variant="secondary" disabled={index<=0} aria-label="Biểu mẫu trước"
          onClick={()=>ctrl.selectDoc(included[index-1].templateId)}><ChevronLeft className="w-4 h-4" /></Button>
        <Button variant="secondary" disabled={index>=included.length-1} aria-label="Biểu mẫu tiếp theo"
          onClick={()=>ctrl.selectDoc(included[index+1].templateId)}><ChevronRight className="w-4 h-4" /></Button>
      </div>
    </div>
    {!treeNavigation && optional.length>0 && <div className="flex flex-wrap gap-3 px-3 pb-3">
      {optional.map(doc=><label key={doc.templateId} className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
        <input type="checkbox" checked={!ctrl.isExcluded(doc.templateId)} onChange={()=>ctrl.toggleOptional(doc.templateId)}
          className="accent-accent" />
        Gồm {TEMPLATE_BY_ID[doc.templateId]?.label ?? doc.templateId}
      </label>)}
    </div>}
  </div>;
}
