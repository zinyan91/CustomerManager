// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocumentDossierController } from '../../hooks/useDocumentDossierController';
import { DossierNavigation } from '../documents/dossier/DossierNavigation';
import { DOSSIERS } from '../documents/registry/dossiers';

function Fixture() {
  const ctrl=useDocumentDossierController();
  return <>
    <DossierNavigation ctrl={ctrl} />
    <input aria-label="Tên thử" value={ctrl.state.common.partyA.name}
      onChange={event=>ctrl.patchCommon({partyA:{...ctrl.state.common.partyA,name:event.target.value}})} />
    <output data-testid="selection">{ctrl.state.activeDossierId}:{ctrl.state.activeDocId}</output>
  </>;
}
afterEach(cleanup);
describe('horizontal dossier navigation',()=>{
  it('exposes every dossier and its templates without another tree or side rail',()=>{
    const {container}=render(<Fixture />);
    expect(within(screen.getByLabelText('Bộ hồ sơ')).getAllByRole('option')).toHaveLength(DOSSIERS.length);
    for(const dossier of DOSSIERS){
      fireEvent.change(screen.getByLabelText('Bộ hồ sơ'),{target:{value:dossier.id}});
      expect(within(screen.getByLabelText('Biểu mẫu')).getAllByRole('option').map(option=>(option as HTMLOptionElement).value))
        .toEqual(dossier.documents.map(doc=>doc.templateId));
    }
    expect(container.querySelector('nav,aside,[role="tree"]')).toBeNull();
  });
  it('supports previous/next and optional document inclusion without removing the template',()=>{
    render(<Fixture />);
    expect((screen.getByRole('button',{name:'Biểu mẫu trước'}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Biểu mẫu tiếp theo'}));
    expect((screen.getByLabelText('Biểu mẫu') as HTMLSelectElement).value).toBe('bang_ke');
    fireEvent.change(screen.getByLabelText('Biểu mẫu'),{target:{value:'cam_ket'}});
    const include=screen.getByRole('checkbox',{name:/Gồm/}) as HTMLInputElement;
    fireEvent.click(include);
    expect(include.checked).toBe(false);
    expect((screen.getByLabelText('Biểu mẫu') as HTMLSelectElement).value).toBe('sale_contract');
    expect(within(screen.getByLabelText('Biểu mẫu')).getByRole('option',{name:'Giấy Cam Kết'})).toBeTruthy();
  });
  it('preserves separate form state when switching dossiers',()=>{
    render(<Fixture />);
    fireEvent.change(screen.getByLabelText('Tên thử'),{target:{value:'Bộ giải ngân'}});
    fireEvent.change(screen.getByLabelText('Bộ hồ sơ'),{target:{value:'sua_chua_nha'}});
    fireEvent.change(screen.getByLabelText('Tên thử'),{target:{value:'Bộ sửa nhà'}});
    fireEvent.change(screen.getByLabelText('Bộ hồ sơ'),{target:{value:'giai_ngan'}});
    expect((screen.getByLabelText('Tên thử') as HTMLInputElement).value).toBe('Bộ giải ngân');
    fireEvent.change(screen.getByLabelText('Bộ hồ sơ'),{target:{value:'sua_chua_nha'}});
    expect((screen.getByLabelText('Tên thử') as HTMLInputElement).value).toBe('Bộ sửa nhà');
  });
});
