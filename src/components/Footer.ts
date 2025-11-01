export const createFooter = (): HTMLElement => {
  const footer = document.createElement('footer');
  footer.className = 'app-footer';

  const inner = document.createElement('div');
  inner.className = 'app-footer__inner';

  const summary = document.createElement('p');
  summary.textContent = '迷你宇宙是一个收集微型创意小游戏的实验场，由好奇心驱动。';

  const contact = document.createElement('p');
  const contactLink = document.createElement('a');
  contactLink.className = 'app-footer__link';
  contactLink.href = '#/games';
  contactLink.textContent = '前往小游戏列表';
  contact.append('想继续探索更多世界？ ', contactLink, '。');

  inner.append(summary, contact);
  footer.appendChild(inner);

  return footer;
};
