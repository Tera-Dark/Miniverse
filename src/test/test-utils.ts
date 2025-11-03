import { getQueriesForElement, prettyDOM } from '@testing-library/dom';

type RenderResult = ReturnType<typeof getQueriesForElement> & {
  container: HTMLElement;
  prettyDOM: typeof prettyDOM;
};

type RenderInput = string | Node;

export function render(ui: RenderInput): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);

  if (typeof ui === 'string') {
    container.innerHTML = ui;
  } else {
    container.appendChild(ui);
  }

  const queries = getQueriesForElement(container);

  return {
    container,
    prettyDOM,
    ...queries
  };
}

export function createDomHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}
