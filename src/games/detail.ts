import { createButton } from '@/components/Button';
import { gamesIndexPath, type GameDefinition } from '@/games';
import type { GameDifficultyPreset, GameMeta, GameModule } from '@/games/types';

export const renderGameDetail = (target: HTMLElement, definition: GameDefinition): (() => void) => {
  target.innerHTML = '';

  const container = document.createElement('section');
  container.className = 'game-detail';

  const backLink = createButton({
    label: '返回小游戏列表',
    href: `#${gamesIndexPath}`,
    leadingIcon: '←',
    variant: 'ghost'
  });

  const header = document.createElement('div');
  header.className = 'game-detail__header';

  const heading = document.createElement('h1');
  heading.className = 'game-detail__title';

  const description = document.createElement('p');
  description.className = 'game-detail__description';

  header.append(heading, description);

  const metadata = document.createElement('div');
  metadata.className = 'game-detail__metadata';

  const tagsSection = document.createElement('div');
  tagsSection.className = 'game-detail__section';
  const tagsTitle = document.createElement('h2');
  tagsTitle.className = 'game-detail__section-title';
  tagsTitle.textContent = '玩法标签';
  const tagsList = document.createElement('ul');
  tagsList.className = 'game-detail__tags';
  tagsSection.append(tagsTitle, tagsList);

  const presetsSection = document.createElement('div');
  presetsSection.className = 'game-detail__section';
  const presetsTitle = document.createElement('h2');
  presetsTitle.className = 'game-detail__section-title';
  presetsTitle.textContent = '难度预设';
  const presetsList = document.createElement('ul');
  presetsList.className = 'game-detail__presets';
  presetsSection.append(presetsTitle, presetsList);

  metadata.append(tagsSection, presetsSection);

  container.append(backLink, header, metadata);

  const host = document.createElement('div');
  host.className = 'game-host';
  host.setAttribute('role', 'region');
  host.setAttribute('aria-live', 'polite');
  host.textContent = '正在装载这个小游戏…';

  target.append(container, host);

  let isActive = true;
  let activeModule: GameModule | null = null;

  const updateMetadataVisibility = () => {
    const hasTags = tagsList.childElementCount > 0;
    const hasPresets = presetsList.childElementCount > 0;
    metadata.hidden = !hasTags && !hasPresets;
    tagsSection.hidden = !hasTags;
    presetsSection.hidden = !hasPresets;
  };

  const syncTags = (tags: GameDefinition['tags']) => {
    tagsList.innerHTML = '';

    if (!tags || tags.length === 0) {
      updateMetadataVisibility();
      return;
    }

    tags.forEach((tag: string) => {
      const item = document.createElement('li');
      item.className = 'game-detail__tag';
      item.textContent = tag;
      tagsList.appendChild(item);
    });

    updateMetadataVisibility();
  };

  const syncPresets = (presets: GameDefinition['difficultyPresets']) => {
    presetsList.innerHTML = '';

    if (!presets || presets.length === 0) {
      updateMetadataVisibility();
      return;
    }

    presets.forEach((preset: GameDifficultyPreset) => {
      const item = document.createElement('li');
      item.className = 'game-detail__preset';
      item.dataset.presetId = preset.id;

      const label = document.createElement('span');
      label.className = 'game-detail__preset-label';
      label.textContent = preset.label;

      item.appendChild(label);

      if (preset.description) {
        const body = document.createElement('p');
        body.className = 'game-detail__preset-description';
        body.textContent = preset.description;
        item.appendChild(body);
      }

      presetsList.appendChild(item);
    });

    updateMetadataVisibility();
  };

  const applyMeta = (meta: GameMeta) => {
    heading.textContent = meta.title;
    description.textContent = meta.description;
    container.style.setProperty('--game-accent', meta.accentColor);
    syncTags(meta.tags ?? definition.tags);
    syncPresets(meta.difficultyPresets ?? definition.difficultyPresets);
  };

  applyMeta(definition);

  definition
    .loader()
    .then((module: GameModule) => {
      if (!isActive) {
        module.destroy();
        return;
      }

      activeModule = module;
      const meta = module.getMeta();
      applyMeta(meta);
      host.textContent = '';

      module.init(host, {});
    })
    .catch((error: unknown) => {
      if (!isActive) {
        return;
      }

      console.error('Failed to load game module', error);
      host.textContent = '当前无法加载该小游戏，请稍后再试。';
    });

  updateMetadataVisibility();

  return () => {
    isActive = false;

    if (activeModule) {
      try {
        activeModule.destroy();
      } catch (error) {
        console.error('Error while tearing down game module', error);
      }
    }

    activeModule = null;
    target.innerHTML = '';
  };
};
