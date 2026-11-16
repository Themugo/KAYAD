import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import InventoryFilterPanel, { ANY, type FilterValues } from '../../features/VehicleMarketplace/components/InventoryFilterPanel';

const base: FilterValues = { make: ANY, model: ANY, body: ANY, fuel: ANY, transmission: ANY, condition: ANY, color: ANY, seller: ANY, minPrice: 0, maxPrice: 20000000, minYear: 0, maxYear: 2026, maxMileage: 250000, auction: false };
const options = { makes: [ANY, 'Mazda', 'Toyota'], models: [ANY, 'Prado'], bodies: [ANY, 'SUV'], fuels: [ANY, 'Petrol'], transmissions: [ANY, 'Automatic'], conditions: [ANY, 'Used'], colors: [ANY, 'White'], sellers: [ANY, 'Verified Dealer', 'Private Seller'], priceSteps: [1000000, 3000000], yearFrom: 2000, mileageSteps: [50000, 100000] };
const limits = { priceMax: 20000000, yearMax: 2026, mileageMax: 250000 };
const setup = (values: Partial<FilterValues> = {}) => {
  const onChange = vi.fn(); const onReset = vi.fn();
  render(<InventoryFilterPanel idPrefix="t" variant="sheet" values={{ ...base, ...values }} limits={limits} options={options} onChange={onChange} onReset={onReset} />);
  return { onChange, onReset };
};
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('InventoryFilterPanel — one panel, typed entry everywhere', () => {
  it('offers the system suggestions without "All" and lets the visitor type something else', () => {
    setup();
    const make = screen.getByLabelText('Make filter') as HTMLInputElement;
    const opts = Array.from(document.querySelectorAll(`datalist[id="${make.getAttribute('list')}"] option`)).map((o) => (o as HTMLOptionElement).value);
    expect(opts).toEqual(['Mazda', 'Toyota']);
    fireEvent.change(make, { target: { value: 'Subaru Forester' } });
    expect((make as HTMLInputElement).value).toBe('Subaru Forester');
  });

  it('commits typed text after a pause, on Enter and on blur — and clearing returns to Any', () => {
    vi.useFakeTimers();
    const { onChange } = setup();
    const make = screen.getByLabelText('Make filter');
    fireEvent.change(make, { target: { value: 'Subaru' } });
    expect(onChange).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(500); });
    expect(onChange).toHaveBeenCalledWith({ make: 'Subaru', model: ANY });
    const body = screen.getByLabelText('Body style filter');
    fireEvent.change(body, { target: { value: 'Station wagon' } });
    fireEvent.keyDown(body, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ body: 'Station wagon' });
    fireEvent.change(screen.getByLabelText('Colour filter'), { target: { value: 'Pearl white' } });
    fireEvent.blur(screen.getByLabelText('Colour filter'));
    expect(onChange).toHaveBeenCalledWith({ color: 'Pearl white' });
  });

  it('clear button resets a typed field to Any', () => {
    const { onChange } = setup({ make: 'Toyota' });
    fireEvent.click(screen.getByRole('button', { name: /clear make/i }));
    expect(onChange).toHaveBeenCalledWith({ make: ANY, model: ANY });
  });

  it('numbers are typed by hand: formatted, digits-only, capped, empty means no limit', () => {
    const { onChange } = setup();
    const max = screen.getByLabelText('Max price') as HTMLInputElement;
    fireEvent.change(max, { target: { value: '2,750,000abc' } });
    fireEvent.blur(max);
    expect(onChange).toHaveBeenCalledWith({ maxPrice: 2750000 });
    expect(max.value).toBe('2,750,000');
    fireEvent.change(max, { target: { value: '99999999999' } });
    fireEvent.blur(max);
    // Above the platform ceiling is capped to it, which is the same as "no maximum" and shows as an empty field.
    expect(max.value).toBe('');
    const from = screen.getByLabelText('From year');
    fireEvent.change(from, { target: { value: '2015' } });
    fireEvent.keyDown(from, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ minYear: 2015 });
    const mileage = screen.getByLabelText('Maximum mileage');
    fireEvent.change(mileage, { target: { value: '80000' } });
    fireEvent.blur(mileage);
    expect(onChange).toHaveBeenCalledWith({ maxMileage: 80000 });
  });

  it('admin-configured price steps appear as quick picks next to the typed field', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: '< 3M' }));
    expect(onChange).toHaveBeenCalledWith({ maxPrice: 3000000 });
  });

  it('seller type, live auctions and reset work', () => {
    const { onChange, onReset } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Private Seller' }));
    expect(onChange).toHaveBeenCalledWith({ seller: 'Private Seller' });
    fireEvent.click(screen.getByLabelText(/Live auction listings/i));
    expect(onChange).toHaveBeenCalledWith({ auction: true });
    fireEvent.click(screen.getByRole('button', { name: /reset all filters/i }));
    expect(onReset).toHaveBeenCalled();
  });

  it('an external reset empties the typed text', () => {
    const { rerender } = render(<InventoryFilterPanel idPrefix="t" variant="sheet" values={{ ...base, make: 'Subaru' }} limits={limits} options={options} onChange={vi.fn()} onReset={vi.fn()} />);
    expect((screen.getByLabelText('Make filter') as HTMLInputElement).value).toBe('Subaru');
    rerender(<InventoryFilterPanel idPrefix="t" variant="sheet" values={base} limits={limits} options={options} onChange={vi.fn()} onReset={vi.fn()} />);
    expect((screen.getByLabelText('Make filter') as HTMLInputElement).value).toBe('');
  });
});
