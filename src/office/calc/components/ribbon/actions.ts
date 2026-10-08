/** Trả bàn phím về lưới sau khi bấm nút ribbon. */
export const sheetFocus = (): void => {
  document.querySelector<HTMLElement>('.calc-grid')?.focus({ preventScroll: true });
};

/** Chạy một thay đổi rồi trả bàn phím về lưới. */
export const act = (fn: () => void) => () => {
  fn();
  sheetFocus();
};
