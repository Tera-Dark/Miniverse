export const createFooter = (): HTMLElement => {
  const footer = document.createElement('footer');
  footer.className = 'app-footer';

  const inner = document.createElement('div');
  inner.className = 'app-footer__inner';

  const copyright = document.createElement('p');
  copyright.style.margin = '0';
  copyright.textContent = '© 2024 miniverse. A curiosity-driven experimental game hub.';

  inner.appendChild(copyright);
  footer.appendChild(inner);

  return footer;
};
