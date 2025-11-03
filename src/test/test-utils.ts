import { render } from '@testing-library/dom';

type RenderOptions = Parameters<typeof render>[1];
type RenderResult = ReturnType<typeof render>;

export const renderElement = (element: HTMLElement, options?: RenderOptions): RenderResult => {
  return render(element, options);
};

export const renderComponent = (factory: () => HTMLElement, options?: RenderOptions): RenderResult => {
  return renderElement(factory(), options);
};

export const createDomHost = (): HTMLElement => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
};
