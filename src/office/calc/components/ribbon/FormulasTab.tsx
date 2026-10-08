import React, { useState } from 'react';
import { BookOpen, Braces, Calculator, CalendarClock, CircleDollarSign, Eye, FunctionSquare, Info, ListTree, Search, Sigma, Type } from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { CalcController } from '../../controller';
import { FUNCTION_GROUPS, type FunctionGroup } from '../../engine/functionCatalog';
import { Group } from '../../../shared/ribbon/controls';
import type { ViewOptions } from '../viewOptions';
import { InsertFunctionDialog } from '../InsertFunctionDialog';
import { act, sheetFocus } from './actions';
import { MenuButton, TextBtn } from './helpers';

const GROUP_ICONS: Record<FunctionGroup, React.ReactNode> = {
  financial: <CircleDollarSign size={16} />,
  logical: <ListTree size={16} />,
  text: <Type size={16} />,
  dateTime: <CalendarClock size={16} />,
  lookup: <Search size={16} />,
  math: <Calculator size={16} />,
  statistical: <BookOpen size={16} />,
  information: <Info size={16} />,
  array: <Braces size={16} />,
};

const LIBRARY_ORDER: FunctionGroup[] = ['financial', 'logical', 'text', 'dateTime', 'lookup', 'math', 'statistical', 'information', 'array'];

export interface FormulasTabProps {
  controller: CalcController;
  view: ViewOptions;
  onView: (view: ViewOptions) => void;
}

export const FormulasTab: React.FC<FormulasTabProps> = ({ controller, view, onView }) => {
  const { m } = useOfficeI18n();
  const t = m.ribbon.formulas;
  const [dialog, setDialog] = useState(false);

  const insert = (name: string) => {
    controller.insertFunction(name);
    sheetFocus();
  };

  return (
    <div className="wr-tab-body">
      <Group label={t.library}>
        <TextBtn label={t.insertFunction} icon={<FunctionSquare size={18} />} onClick={() => setDialog(true)} />
        <MenuButton
          label={m.calc.cmd.autoSum}
          icon={<Sigma size={18} />}
          items={[
            { label: m.calc.cmd.sum, run: () => controller.autoSum('SUM') },
            { label: m.calc.cmd.average, run: () => controller.autoSum('AVERAGE') },
            { label: m.calc.cmd.count, run: () => controller.autoSum('COUNT') },
            { label: m.calc.cmd.max, run: () => controller.autoSum('MAX') },
            { label: m.calc.cmd.min, run: () => controller.autoSum('MIN') },
          ]}
        />
        {LIBRARY_ORDER.map((key) => (
          <MenuButton key={key} label={t.groups[key]} icon={GROUP_ICONS[key]} items={FUNCTION_GROUPS[key].map((name) => ({ label: name, run: () => insert(name) }))} />
        ))}
      </Group>
      <Group label={t.auditing}>
        <TextBtn label={t.showFormulas} icon={<Eye size={18} />} active={view.showFormulas} onClick={act(() => onView({ ...view, showFormulas: !view.showFormulas }))} />
      </Group>
      {dialog && (
        <InsertFunctionDialog
          onClose={() => setDialog(false)}
          onInsert={(name) => {
            setDialog(false);
            insert(name);
          }}
        />
      )}
    </div>
  );
};
