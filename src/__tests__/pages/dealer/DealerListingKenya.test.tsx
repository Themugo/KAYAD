import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({ updateCar: vi.fn(), createCar: vi.fn() }));
vi.mock('../../../services/vehicleApi', async (orig) => ({ ...(await orig<any>()), updateCar: m.updateCar, createCar: m.createCar }));
vi.mock('../../../pages/dealer/dashboard/DealerListingPhotos', () => ({ default: () => null }));

import DealerListingForm from '../../../pages/dealer/dashboard/DealerListingForm';
import { VehicleApiError } from '../../../services/vehicleApi';

const car: any = { id: 'c1', title: 'Toyota Harrier', brand: 'Toyota', model: 'Harrier', year: 2018, price: 2450000, mileage: 85000, fuel: 'Gasoline', condition: 'Foreign Used', images: [] };
const opts = (label: RegExp) => within(screen.getByLabelText(label)).getAllByRole('option').map((o) => (o as HTMLOptionElement).value);
const mount = (c: any = car) => render(<DealerListingForm mode="edit" car={c} onSaved={vi.fn()} onCancel={vi.fn()} />);

beforeEach(() => { vi.clearAllMocks(); m.updateCar.mockResolvedValue({ success: true, data: car }); });

describe('Kenyan listing form', () => {
  it('offers Petrol (not Gasoline) and the Kenyan condition list', () => {
    mount({ ...car, fuel: '', condition: '' });
    expect(opts(/^Fuel/)).toEqual(['', 'Petrol', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric']);
    expect(opts(/^Condition/)).toEqual(['', 'Ex-Japan', 'Locally Used', 'New Import', 'Locally Assembled']);
  });

  it('shows stored figures with commas and maps a legacy Gasoline listing to Petrol', () => {
    mount();
    expect(screen.getByLabelText(/Price/)).toHaveValue('2,450,000');
    expect(screen.getByLabelText(/Mileage/)).toHaveValue('85,000');
    expect(screen.getByLabelText(/^Fuel/)).toHaveValue('Petrol');
  });

  it('keeps a legacy condition visible instead of silently dropping it', () => {
    mount();
    expect(screen.getByLabelText(/^Condition/)).toHaveValue('Foreign Used');
  });

  it('formats as the lister types and sends plain numbers', async () => {
    const user = userEvent.setup();
    mount({ ...car, price: undefined, mileage: undefined });
    await user.type(screen.getByLabelText(/Price/), '1850000');
    await user.type(screen.getByLabelText(/Mileage/), '85000');
    expect(screen.getByLabelText(/Price/)).toHaveValue('1,850,000');
    expect(screen.getByLabelText(/Mileage/)).toHaveValue('85,000');
    await user.click(screen.getByRole('button', { name: /save|update|submit/i }));
    await waitFor(() => expect(m.updateCar).toHaveBeenCalled());
    const payload = m.updateCar.mock.calls[0][1];
    expect(payload.price).toBe(1850000);
    expect(payload.mileage).toBe(85000);
    expect(payload.fuel).toBe('Petrol');
  });

  it('explains a missing dealer plan in plain words and keeps the entries', async () => {
    const user = userEvent.setup();
    m.updateCar.mockRejectedValue(new VehicleApiError('An active dealer subscription is required to list vehicles.', 'server', 403, { code: 'SUBSCRIPTION_REQUIRED' } as any));
    mount();
    await user.click(screen.getByRole('button', { name: /save|update|submit/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/needs an active listing plan/i);
    expect(alert).toHaveTextContent(/entries have been kept/i);
    expect(screen.getByLabelText(/Price/)).toHaveValue('2,450,000');
  });
});

describe('Listing form: required fields and server answers (listing audit)', () => {
  const create = () => render(<DealerListingForm mode="create" car={null} onSaved={vi.fn()} onCancel={vi.fn()} />);

  it('Model, Year and Price are required, shown as such, and block the request', async () => {
    const user = userEvent.setup();
    create();
    await user.type(screen.getByLabelText(/^Title/), 'Toyota Axio');
    await user.type(screen.getByLabelText(/^Brand/), 'Toyota');
    await user.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText('Model is required.')).toBeInTheDocument();
    expect(screen.getByText('Year is required.')).toBeInTheDocument();
    expect(screen.getByText('Price is required.')).toBeInTheDocument();
    expect(m.createCar).not.toHaveBeenCalled();
  });
  it('mileage above 2,000,000 km is refused before it reaches the server', async () => {
    const user = userEvent.setup();
    mount();
    const mileage = screen.getByLabelText(/Mileage/);
    await user.clear(mileage);
    await user.type(mileage, '3000000');
    await user.click(screen.getByRole('button', { name: /save|update|submit/i }));
    expect(await screen.findByText(/Mileage must not exceed 2,000,000 km/)).toBeInTheDocument();
    expect(m.updateCar).not.toHaveBeenCalled();
  });
  it('a server validation / duplicate-VIN answer is shown as the server worded it, entries kept', async () => {
    const user = userEvent.setup();
    m.updateCar.mockRejectedValue(new VehicleApiError('A vehicle with this VIN is already listed.', 'server', 409, { code: 'DUPLICATE_VIN' } as any));
    mount();
    await user.click(screen.getByRole('button', { name: /save|update|submit/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A vehicle with this VIN is already listed.');
    expect(screen.getByLabelText(/^Title/)).toHaveValue('Toyota Harrier');
  });
  it('a server fault (5xx) is explained in plain words and the entries are kept', async () => {
    const user = userEvent.setup();
    m.updateCar.mockRejectedValue(new VehicleApiError('Failed to create car', 'server', 500));
    mount();
    await user.click(screen.getByRole('button', { name: /save|update|submit/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/server problem/i);
    expect(screen.getByLabelText(/^Title/)).toHaveValue('Toyota Harrier');
  });
});
