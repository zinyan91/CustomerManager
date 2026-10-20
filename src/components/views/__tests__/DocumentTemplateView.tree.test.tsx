// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { DocumentTemplateView } from '../DocumentTemplateView';
import { SidebarCollapseProvider, useSidebarCollapse } from '../../../context/SidebarCollapseContext';

afterEach(() => { cleanup(); localStorage.clear(); });
const tree = () => within(screen.getByRole('navigation', { name: 'Bộ hồ sơ' }));
const openFolder = (name:string) => {
  const folder=tree().getByRole('button',{name});
  if(folder.getAttribute('aria-expanded')!=='true') fireEvent.click(folder);
};
const pick = (name:string) => fireEvent.click(tree().getByRole('button',{name}));
const included = (dossier:string) => tree().getByRole('checkbox',{name:`Gồm Giấy Cam Kết (${dossier})`}) as HTMLInputElement;

function CollapseToggle() {
  const {toggleSidebar}=useSidebarCollapse();
  return <button onClick={toggleSidebar}>Đổi trạng thái cây</button>;
}

describe('Hồ sơ chứng từ — cây thay menu phụ',()=>{
  it('đặt một cây trong đúng cột sidebar, bỏ các ô chọn ngang',()=>{
    const {container}=render(<DocumentTemplateView />);
    expect(container.querySelector('#app-sidebar nav')).toBe(screen.getByRole('navigation',{name:'Bộ hồ sơ'}));
    expect(container.querySelectorAll('aside')).toHaveLength(1);
    expect(screen.queryByLabelText('Bộ hồ sơ',{selector:'select'})).toBeNull();
    expect(screen.queryByLabelText('Biểu mẫu')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('chọn biểu mẫu từ cây cập nhật bản xem trước',()=>{
    render(<DocumentTemplateView />);
    openFolder('Vận hành tập trung');pick('BM02 - Tờ trình giải ngân');
    expect(screen.getByRole('heading',{name:'BM02 - Tờ trình giải ngân'})).toBeTruthy();
    expect(tree().getByRole('button',{name:'BM02 - Tờ trình giải ngân'}).getAttribute('aria-current')).toBe('true');
  });
  it('lựa chọn gồm độc lập giữa các bộ có cùng biểu mẫu',()=>{
    render(<DocumentTemplateView />);
    openFolder('Hồ sơ sửa chữa nhà');fireEvent.click(included('Hồ sơ sửa chữa nhà'));
    expect(included('Hồ sơ sửa chữa nhà').checked).toBe(false);
    expect(included('Hồ sơ giải ngân').checked).toBe(true);
    expect(tree().getAllByRole('button',{name:'Giấy Cam Kết'}).filter(button=>button.hasAttribute('disabled'))).toHaveLength(1);
  });
  it('thu cây và mở lại bằng cùng trạng thái của thanh điều hướng',()=>{
    localStorage.setItem('cm_sidebar_collapsed','false');
    render(<SidebarCollapseProvider><CollapseToggle /><DocumentTemplateView /></SidebarCollapseProvider>);
    fireEvent.click(tree().getByRole('button',{name:'Ẩn Bộ hồ sơ'}));
    expect(document.querySelector('#app-sidebar')).toBeNull();
    expect(localStorage.getItem('cm_sidebar_collapsed')).toBe('true');
    fireEvent.click(screen.getByRole('button',{name:'Đổi trạng thái cây'}));
    expect(document.querySelector('#app-sidebar')).toBeTruthy();
  });
  it('mở cây dạng drawer, chọn mẫu rồi đóng và trả về workspace',()=>{
    render(<DocumentTemplateView />);
    fireEvent.click(screen.getByRole('button',{name:'Mở cây hồ sơ'}));
    const drawer=within(screen.getByRole('dialog',{name:'Bộ hồ sơ'}));
    fireEvent.click(drawer.getByRole('button',{name:'Bảng Kê Bán Hàng'}));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading',{name:'Bảng Kê Bán Hàng'})).toBeTruthy();
  });
  it('giữ dữ liệu riêng của mỗi bộ hồ sơ khi chuyển mẫu',()=>{
    const {container}=render(<DocumentTemplateView />);
    fireEvent.change(container.querySelector('#partyA-name')!,{target:{value:'Khách giải ngân'}});
    openFolder('Hồ sơ sửa chữa nhà');pick('HĐ Thi Công Nhà Ở');
    expect(screen.queryByDisplayValue('Khách giải ngân')).toBeNull();
    openFolder('Hồ sơ giải ngân');pick('HĐ Mua Bán Hàng Hóa');
    expect(screen.getByDisplayValue('Khách giải ngân')).toBeTruthy();
  });
});
