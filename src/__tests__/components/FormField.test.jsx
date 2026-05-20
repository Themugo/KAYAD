import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FormField } from '../../components/FormField';

describe('FormField', () => {
  afterEach(() => { cleanup(); });

  it('renders label and input', () => {
    render(<FormField label="Email" name="email" type="email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });

  it('renders textarea for textarea type', () => {
    render(<FormField label="Bio" name="bio" type="textarea" rows={3} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders select with options', () => {
    const options = [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ];
    render(<FormField label="Choose" name="choose" type="select" options={options} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<FormField label="Name" name="name" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('displays help text when no error', () => {
    render(<FormField label="Name" name="name" helpText="Enter your name" />);
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });

  it('fires onChange handler', () => {
    const onChange = vi.fn();
    render(<FormField label="Name" name="name" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'John' } });
    expect(onChange).toHaveBeenCalled();
  });
});
