// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuantityInput } from '../shopping/QuantityInput';
import { PriceInput } from '../shopping/PriceInput';
import { ShoppingChecklistTable } from '../shopping/ShoppingChecklistTable';
import { ShoppingChecklistView } from '../views/ShoppingChecklistView';
import type { ShoppingRoom } from '../../lib/shoppingChecklist';

describe('Shopping Checklist Quantity Input Tests', () => {
  it('QuantityInput correctly handles typing integers, zeros, and decimals', () => {
    const onChange = vi.fn();
    const { container } = render(
      <QuantityInput value={1} onChange={onChange} />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('1');

    // Focus auto-selects
    fireEvent.focus(input);

    // Typing 0
    fireEvent.change(input, { target: { value: '0' } });
    expect(input.value).toBe('0');
    expect(onChange).toHaveBeenCalledWith(0);

    // Typing decimal 0.5
    fireEvent.change(input, { target: { value: '0.5' } });
    expect(input.value).toBe('0.5');
    expect(onChange).toHaveBeenCalledWith(0.5);

    // Typing Vietnamese comma decimal: "2,5"
    fireEvent.change(input, { target: { value: '2,5' } });
    expect(input.value).toBe('2,5');
    expect(onChange).toHaveBeenCalledWith(2.5);

    // Blur cleans up formatting
    fireEvent.blur(input);
    expect(input.value).toBe('2.5');

    // Arrow up increments by 1
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('3.5');
    expect(onChange).toHaveBeenCalledWith(3.5);

    // Arrow down decrements by 1
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('2.5');
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('correctly updates item in ShoppingChecklistTable', () => {
    const onUpdateItem = vi.fn();
    const room: ShoppingRoom = {
      id: 'r1',
      name: 'Phòng khách',
      items: [
        {
          id: 'item1',
          name: 'Ghế sofa',
          unit: 'Bộ',
          quantity: 1,
          unitPrice: 10000000,
        },
      ],
    };

    const { container } = render(
      <ShoppingChecklistTable
        floorId="f1"
        room={room}
        onAddItem={vi.fn()}
        onOpenCatalogPicker={vi.fn()}
        onUpdateItem={onUpdateItem}
        onRemoveItem={vi.fn()}
      />
    );

    const qtyInput = container.querySelector('input[inputmode="decimal"]') as HTMLInputElement;
    expect(qtyInput).toBeTruthy();
    expect(qtyInput.value).toBe('1');

    // Simulate entering 15
    fireEvent.change(qtyInput, { target: { value: '15' } });
    expect(onUpdateItem).toHaveBeenCalledWith('item1', { quantity: 15 });

    // Simulate entering 0
    fireEvent.change(qtyInput, { target: { value: '0' } });
    expect(onUpdateItem).toHaveBeenCalledWith('item1', { quantity: 0 });

    // Real Unit Price input is at index 3
    const priceInput = container.querySelectorAll('input[type="text"]')[3] as HTMLInputElement;
    console.log('Real price input value:', priceInput.value);
    
    // Simulate user typing into price input
    fireEvent.change(priceInput, { target: { value: '50000000' } });
    console.log('Last onUpdateItem call:', onUpdateItem.mock.calls[onUpdateItem.mock.calls.length - 1]);
  });

  it('checks full view integration when typing quantity in ShoppingChecklistView', async () => {
    const user = userEvent.setup();
    const { container } = render(<ShoppingChecklistView />);

    // Find first quantity input
    const qtyInputs = container.querySelectorAll('input[inputmode="decimal"]');
    expect(qtyInputs.length).toBeGreaterThan(0);
    const firstQtyInput = qtyInputs[0] as HTMLInputElement;
    expect(firstQtyInput.value).toBe('1');

    // Try typing 5 in the input using userEvent
    await user.clear(firstQtyInput);
    await user.type(firstQtyInput, '5');
    expect(firstQtyInput.value).toBe('5');

    // Try typing 0
    await user.clear(firstQtyInput);
    await user.type(firstQtyInput, '0');
    expect(firstQtyInput.value).toBe('0');

    // Try typing 1.5 into quantity
    await user.clear(firstQtyInput);
    await user.type(firstQtyInput, '1.5');
    expect(firstQtyInput.value).toBe('1.5');

    // Find first unit price input (index 3 of text inputs)
    const firstPriceInput = container.querySelectorAll('input[type="text"]')[3] as HTMLInputElement;
    console.log('Initial firstPriceInput.value:', firstPriceInput.value);

    // Let's test clearing and typing 25000000 into price input
    await user.clear(firstPriceInput);
    await user.type(firstPriceInput, '25000000');
    expect(firstPriceInput.value).toBe('25.000.000');
  }, 20000);

  it('PriceInput correctly formats numbers and handles backspace/clear', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PriceInput value={180000000} onChange={onChange} />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('180.000.000');

    // Simulate typing new amount
    fireEvent.change(input, { target: { value: '25000000' } });
    expect(input.value).toBe('25.000.000');
    expect(onChange).toHaveBeenCalledWith(25000000);

    // Simulate typing 0
    fireEvent.change(input, { target: { value: '0' } });
    expect(input.value).toBe('0');
    expect(onChange).toHaveBeenCalledWith(0);

    // Simulate clearing
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
