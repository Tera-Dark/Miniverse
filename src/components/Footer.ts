export const createFooter = (): HTMLElement => {
  const footer = document.createElement('footer');
  footer.className = 'app-footer';

  const inner = document.createElement('div');
  inner.className = 'app-footer__inner';

  const copyright = document.createElement('p');
  copyright.innerHTML =
    'Miniverse is a playground for small, delightful experiments. Crafted with curiosity.';

  const contact = document.createElement('p');
  const contactLink = document.createElement('a');
  contactLink.className = 'app-footer__link';
  contactLink.href = '#/games';
  contactLink.textContent = 'Explore the games';
  contact.append('Ready to explore more worlds? ', contactLink, '.');

  inner.append(copyright, contact);
  footer.appendChild(inner);

  return footer;
};
