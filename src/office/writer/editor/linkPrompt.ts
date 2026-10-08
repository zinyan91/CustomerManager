import type { Editor } from '@tiptap/react';

/** Asks for an address and sets, changes or (when left empty) removes the link at the cursor. */
export function promptLink(editor: Editor, message: string): void {
  const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
  const href = window.prompt(message, previous);
  if (href === null) return;
  const chain = editor.chain().focus().extendMarkRange('link');
  if (href.trim() === '') chain.unsetLink().run();
  else chain.setLink({ href: href.trim() }).run();
}
