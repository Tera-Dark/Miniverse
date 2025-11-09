import { screen } from '@testing-library/dom';

import { createButton } from '@/components/Button';
import { render } from '@/test/test-utils';

describe('createButton', () => {
  it('renders a button with the provided label and variant', () => {
    render(createButton({ label: 'Start Session', variant: 'secondary' }));

    const button = screen.getByRole('button', { name: 'Start Session' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('button', 'button--secondary');
    expect(button.getAttribute('role') ?? 'button').toBe('button');
    expect(button.querySelector('.button__text')).toHaveTextContent('Start Session');
  });

  it('renders a link-styled button when href is provided', () => {
    render(createButton({ label: 'View Docs', href: '/docs', variant: 'ghost' }));

    const link = screen.getByRole('link', { name: 'View Docs' });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/docs');
    expect(link).toHaveClass('button', 'button--ghost');
    expect(link).not.toHaveAttribute('role');
    expect(link.querySelector('.button__text')).toHaveTextContent('View Docs');
  });

  it('renders button with leading and trailing icons', () => {
    render(createButton({ 
      label: 'Save', 
      leadingIcon: '→', 
      trailingIcon: '✓',
      variant: 'primary' 
    }));

    const button = screen.getByRole('button', { name: 'Save' });
    const leadingIcon = button.querySelector('.button__icon--leading');
    const trailingIcon = button.querySelector('.button__icon--trailing');
    const text = button.querySelector('.button__text');

    expect(button).toBeInTheDocument();
    expect(leadingIcon).toBeInTheDocument();
    expect(leadingIcon).toHaveTextContent('→');
    expect(trailingIcon).toBeInTheDocument();
    expect(trailingIcon).toHaveTextContent('✓');
    expect(text).toBeInTheDocument();
    expect(text).toHaveTextContent('Save');
  });
});
