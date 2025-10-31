export function createFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'site-footer surface';

  const inner = document.createElement('div');
  inner.className = 'container site-footer__inner';

  const message = document.createElement('p');
  message.textContent = 'Miniverse · A tiny home for playful experiments.';

  const note = document.createElement('p');
  note.textContent = 'More adventures are on the way. Join us soon.';

  inner.append(message, note);
  footer.append(inner);

  return footer;
}
