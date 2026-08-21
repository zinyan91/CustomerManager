// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../Tabs';

afterEach(cleanup);

describe('Tabs Component', () => {
  it('switches tab content when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab Thứ Nhất</TabsTrigger>
          <TabsTrigger value="tab2">Tab Thứ Hai</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Nội dung 1</TabsContent>
        <TabsContent value="tab2">Nội dung 2</TabsContent>
      </Tabs>
    );

    expect(screen.getByText('Nội dung 1')).toBeTruthy();
    expect(screen.queryByText('Nội dung 2')).toBeNull();

    await user.click(screen.getByRole('tab', { name: 'Tab Thứ Hai' }));
    expect(screen.queryByText('Nội dung 1')).toBeNull();
    expect(screen.getByText('Nội dung 2')).toBeTruthy();
  });
});
