export function printHtmlDoc(html: string, title?: string): boolean {
  if (typeof document === 'undefined') return false;

  const frame = document.createElement('iframe');
  frame.setAttribute('title', title ?? 'Bản in');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return false;
  }

  const cleanup = () => {
    if (frame.parentNode) frame.remove();
  };

  doc.open();
  doc.write(html);
  doc.close();

  win.addEventListener('afterprint', cleanup);
  win.focus();
  win.print();
  window.setTimeout(cleanup, 60_000);
  return true;
}
