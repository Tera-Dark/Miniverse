export interface AmbientBackgroundInstance {
  element: HTMLElement;
}

export const createAmbientBackground = (): AmbientBackgroundInstance => {
  const background = document.createElement('div');
  background.className = 'app-background';
  background.setAttribute('aria-hidden', 'true');
  background.setAttribute('role', 'presentation');

  const panels = document.createElement('div');
  panels.className = 'app-background__panels';

  const glow = document.createElement('div');
  glow.className = 'app-background__glow';

  const texture = document.createElement('div');
  texture.className = 'app-background__texture';

  background.append(panels, glow, texture);

  return {
    element: background
  };
};
