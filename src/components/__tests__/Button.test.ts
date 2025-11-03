import { screen } from '@testing-library/dom';

import { createButton } from '@/components/Button';
import { renderComponent } from '@/test/test-utils';

describe('createButton', () => {
  it('renders a button with the provided label and variant', () => {
    renderComponent(() => createButton({ label: 'Start Session', variant: 'secondary' }));

    const button = screen.getByRole('button', { name: 'Start Session' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('button', 'button--secondary');
  });

  it('renders a link-styled button when href is provided', () => {
    renderComponent(() => createButton({ label: 'View Docs', href: '/docs', variant: 'ghost' }));

    const link = screen.getByRole('link', { name: 'View Docs' });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/docs');
    expect(link).toHaveClass('button', 'button--ghost');
  });
});
