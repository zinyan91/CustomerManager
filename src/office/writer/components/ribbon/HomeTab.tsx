import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
  Baseline,
  TextQuote,
  Code,
  WrapText,
} from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { WriterFormatState } from '../../editor/useWriterState';
import { FONT_CHOICES, FONT_SIZES_PT, HIGHLIGHT_COLORS, TEXT_COLORS, fontLabelOf, fontSizePtOf } from '../../../shared/formatOptions';
import { LINE_HEIGHTS } from '../../editor/ParagraphFormat';
import { Btn, Divider, Group, Popover, SelectBox, Swatches } from '../../../shared/ribbon/controls';

export const HomeTab: React.FC<{ editor: Editor; state: WriterFormatState; baseFont: string; baseSize: number }> = ({
  editor,
  state,
  baseFont,
  baseSize,
}) => {
  const { m } = useOfficeI18n();
  const t = m.writer;
  const run = () => editor.chain().focus();

  const fontLabel = fontLabelOf(state.fontFamily) ?? (baseFont || FONT_CHOICES[0].label);
  const fontOptions = FONT_CHOICES.some((choice) => choice.label === fontLabel)
    ? FONT_CHOICES.map((choice) => ({ value: choice.label, label: choice.label }))
    : [{ value: fontLabel, label: fontLabel }, ...FONT_CHOICES.map((choice) => ({ value: choice.label, label: choice.label }))];

  const size = fontSizePtOf(state.fontSize) ?? baseSize;
  const sizeOptions = (FONT_SIZES_PT as readonly number[]).includes(size) ? [...FONT_SIZES_PT] : [size, ...FONT_SIZES_PT].sort((a, b) => a - b);

  const styleValue = String(state.codeBlock ? 0 : state.headingLevel);
  const lineHeight = state.lineHeight ?? '';

  return (
    <div className="wr-tab-body">
      <Group label={t.groups.history}>
        <Btn title={t.cmd.undo} onClick={() => run().undo().run()} disabled={!state.canUndo}>
          <Undo2 size={16} />
        </Btn>
        <Btn title={t.cmd.redo} onClick={() => run().redo().run()} disabled={!state.canRedo}>
          <Redo2 size={16} />
        </Btn>
      </Group>

      <Group label={t.groups.styles}>
        <SelectBox
          title={t.cmd.style}
          width={132}
          value={styleValue}
          onChange={(value) => {
            const level = Number(value);
            if (level === 0) run().setParagraph().run();
            else run().setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
          }}
          options={[
            { value: '0', label: t.styles.normal },
            ...[1, 2, 3, 4, 5, 6].map((level) => ({ value: String(level), label: t.styles.heading(level) })),
          ]}
        />
      </Group>

      <Group label={t.groups.font}>
        <SelectBox
          title={t.cmd.font}
          width={136}
          value={fontLabel}
          onChange={(label) => {
            const choice = FONT_CHOICES.find((c) => c.label === label);
            if (choice) run().setFontFamily(choice.value).run();
          }}
          options={fontOptions}
        />
        <SelectBox
          title={t.cmd.size}
          width={64}
          value={String(size)}
          onChange={(value) => run().setFontSize(`${value}pt`).run()}
          options={sizeOptions.map((pt) => ({ value: String(pt), label: String(pt) }))}
        />
        <Divider />
        <Btn title={t.cmd.bold} active={state.bold} onClick={() => run().toggleBold().run()}>
          <Bold size={16} />
        </Btn>
        <Btn title={t.cmd.italic} active={state.italic} onClick={() => run().toggleItalic().run()}>
          <Italic size={16} />
        </Btn>
        <Btn title={t.cmd.underline} active={state.underline} onClick={() => run().toggleUnderline().run()}>
          <Underline size={16} />
        </Btn>
        <Btn title={t.cmd.strike} active={state.strike} onClick={() => run().toggleStrike().run()}>
          <Strikethrough size={16} />
        </Btn>
        <Btn title={t.cmd.subscript} active={state.subscript} onClick={() => run().toggleSubscript().run()}>
          <Subscript size={16} />
        </Btn>
        <Btn title={t.cmd.superscript} active={state.superscript} onClick={() => run().toggleSuperscript().run()}>
          <Superscript size={16} />
        </Btn>
        <Divider />
        <Popover
          button={({ toggle }) => (
            <Btn title={t.cmd.color} onClick={toggle}>
              <span className="wr-color-btn" style={{ borderBottomColor: state.color ?? 'currentColor' }}>
                <Baseline size={16} />
              </span>
            </Btn>
          )}
        >
          {(close) => (
            <Swatches
              colors={TEXT_COLORS}
              current={state.color}
              noneLabel={t.cmd.noColor}
              onPick={(color) => {
                if (color) run().setColor(color).run();
                else run().unsetColor().run();
                close();
              }}
            />
          )}
        </Popover>
        <Popover
          button={({ toggle }) => (
            <Btn title={t.cmd.highlight} active={state.highlight !== null} onClick={toggle}>
              <Highlighter size={16} />
            </Btn>
          )}
        >
          {(close) => (
            <Swatches
              colors={HIGHLIGHT_COLORS}
              current={state.highlight}
              noneLabel={t.cmd.noColor}
              onPick={(color) => {
                if (color) run().setHighlight({ color }).run();
                else run().unsetHighlight().run();
                close();
              }}
            />
          )}
        </Popover>
        <Btn title={t.cmd.clearFormat} onClick={() => run().unsetAllMarks().clearNodes().run()}>
          <Eraser size={16} />
        </Btn>
      </Group>

      <Group label={t.groups.paragraph}>
        <Btn title={t.cmd.alignLeft} active={state.align === 'left'} onClick={() => run().setTextAlign('left').run()}>
          <AlignLeft size={16} />
        </Btn>
        <Btn title={t.cmd.alignCenter} active={state.align === 'center'} onClick={() => run().setTextAlign('center').run()}>
          <AlignCenter size={16} />
        </Btn>
        <Btn title={t.cmd.alignRight} active={state.align === 'right'} onClick={() => run().setTextAlign('right').run()}>
          <AlignRight size={16} />
        </Btn>
        <Btn title={t.cmd.alignJustify} active={state.align === 'justify'} onClick={() => run().setTextAlign('justify').run()}>
          <AlignJustify size={16} />
        </Btn>
        <Divider />
        <Btn title={t.cmd.bulletList} active={state.bulletList} onClick={() => run().toggleBulletList().run()}>
          <List size={16} />
        </Btn>
        <Btn title={t.cmd.orderedList} active={state.orderedList} onClick={() => run().toggleOrderedList().run()}>
          <ListOrdered size={16} />
        </Btn>
        <Btn title={t.cmd.taskList} active={state.taskList} onClick={() => run().toggleTaskList().run()}>
          <ListChecks size={16} />
        </Btn>
        <Divider />
        <Btn title={t.cmd.outdent} onClick={() => run().outdent().run()}>
          <IndentDecrease size={16} />
        </Btn>
        <Btn title={t.cmd.indent} onClick={() => run().indent().run()}>
          <IndentIncrease size={16} />
        </Btn>
        <Popover
          button={({ toggle }) => (
            <Btn title={t.cmd.lineHeight} onClick={toggle}>
              <WrapText size={16} />
            </Btn>
          )}
        >
          {(close) => (
            <div className="wr-menu">
              {LINE_HEIGHTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`wr-menu-item${lineHeight === value ? ' is-active' : ''}`}
                  onClick={() => {
                    run().setLineHeight(value === '1.15' ? null : value).run();
                    close();
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          )}
        </Popover>
        <Divider />
        <Btn title={t.cmd.quote} active={state.blockquote} onClick={() => run().toggleBlockquote().run()}>
          <TextQuote size={16} />
        </Btn>
        <Btn title={t.cmd.codeBlock} active={state.codeBlock} onClick={() => run().toggleCodeBlock().run()}>
          <Code size={16} />
        </Btn>
      </Group>
    </div>
  );
};
