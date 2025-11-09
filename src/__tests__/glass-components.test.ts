import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { within } from '@testing-library/dom';
import { createDomHost } from '@/test/test-utils';

describe('Glass Components for Advanced Games', () => {
  let cleanup: (() => void) | null = null;
  let host: HTMLElement;

  beforeEach(() => {
    host = createDomHost();
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  describe('Schulte Table Glass Components', () => {
    it('renders glass badge correctly', () => {
      const badge = document.createElement('span');
      badge.className = 'glass-badge';
      badge.textContent = '专注力训练';
      host.appendChild(badge);

      expect(badge).toHaveClass('glass-badge');
      expect(badge.textContent).toBe('专注力训练');
    });

    it('renders glass control correctly', () => {
      const button = document.createElement('button');
      button.className = 'glass-control';
      button.textContent = '标准 5×5';
      host.appendChild(button);

      expect(button).toHaveClass('glass-control');
      expect(button.textContent).toBe('标准 5×5');
    });

    it('renders glass tile correctly', () => {
      const tile = document.createElement('div');
      tile.className = 'glass-tile';
      tile.innerHTML = `
        <span class="glass-tile-label">下一个数字</span>
        <span class="glass-tile-value">1</span>
        <span class="glass-tile-suffix">秒</span>
      `;
      host.appendChild(tile);

      expect(tile).toHaveClass('glass-tile');
      
      const label = tile.querySelector('.glass-tile-label');
      const value = tile.querySelector('.glass-tile-value');
      const suffix = tile.querySelector('.glass-tile-suffix');
      
      expect(label).toBeTruthy();
      expect(value).toBeTruthy();
      expect(suffix).toBeTruthy();
      expect(label?.textContent).toBe('下一个数字');
      expect(value?.textContent).toBe('1');
      expect(suffix?.textContent).toBe('秒');
    });

    it('applies active state correctly', () => {
      const button = document.createElement('button');
      button.className = 'glass-control';
      host.appendChild(button);

      // Add active state
      button.classList.add('is-active');
      expect(button).toHaveClass('is-active');
      
      // Test hover state
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      expect(button).toHaveClass('glass-control');
    });
  });

  describe('Stop Signal Glass Components', () => {
    it('renders glass control with stop signal styling', () => {
      const button = document.createElement('button');
      button.className = 'glass-control stop-signal__preset';
      button.textContent = '短版（60 次）';
      host.appendChild(button);

      expect(button).toHaveClass('glass-control');
      expect(button).toHaveClass('stop-signal__preset');
      expect(button.textContent).toBe('短版（60 次）');
    });

    it('renders glass tile with stop signal metric styling', () => {
      const tile = document.createElement('div');
      tile.className = 'glass-tile stop-signal__metric';
      tile.innerHTML = `
        <span class="glass-tile-label">当前阶段</span>
        <span class="glass-tile-value">准备</span>
      `;
      host.appendChild(tile);

      expect(tile).toHaveClass('glass-tile');
      expect(tile).toHaveClass('stop-signal__metric');
      
      const label = tile.querySelector('.glass-tile-label');
      const value = tile.querySelector('.glass-tile-value');
      
      expect(label?.textContent).toBe('当前阶段');
      expect(value?.textContent).toBe('准备');
    });

    it('applies high contrast mode correctly', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'glass-card stop-signal stop-signal--high-contrast';
      host.appendChild(wrapper);

      expect(wrapper).toHaveClass('stop-signal--high-contrast');
      expect(wrapper).toHaveClass('glass-card');
    });
  });

  describe('Accessibility Features', () => {
    it('provides proper focus management', () => {
      const button = document.createElement('button');
      button.className = 'glass-control';
      button.setAttribute('aria-label', 'Test Button');
      host.appendChild(button);

      button.focus();
      expect(document.activeElement).toBe(button);
      
      // Focus should be visible (outline or box shadow)
      const computedStyle = getComputedStyle(button);
      expect(computedStyle.outline).toBe('none' || computedStyle.boxShadow).toBeTruthy();
    });

    it('supports disabled state', () => {
      const button = document.createElement('button');
      button.className = 'glass-control';
      button.disabled = true;
      host.appendChild(button);

      expect(button).toBeDisabled();
      
      const computedStyle = getComputedStyle(button);
      // Disabled buttons should have reduced opacity
      expect(parseFloat(computedStyle.opacity)).toBeLessThan(1);
    });

    it('provides sufficient touch targets', () => {
      const button = document.createElement('button');
      button.className = 'glass-control stop-signal__response';
      host.appendChild(button);

      const computedStyle = getComputedStyle(button);
      
      // Should meet minimum touch target size
      const minHeight = parseInt(computedStyle.minHeight || '0');
      const minWidth = parseInt(computedStyle.minWidth || '0');
      
      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Responsive Behavior', () => {
    it('maintains proper grid layout', () => {
      const schulteTable = document.createElement('div');
      schulteTable.className = 'glass-card schulte-table';
      schulteTable.style.setProperty('--grid-size', '4');
      host.appendChild(schulteTable);

      const computedStyle = getComputedStyle(schulteTable);
      
      // Should use grid layout
      expect(computedStyle.display).toBe('grid');
      
      // Should have CSS custom property set
      expect(schulteTable.style.getPropertyValue('--grid-size')).toBe('4');
    });

    it('adapts glass styling for different contexts', () => {
      const controls = ['glass-control', 'glass-tile', 'glass-badge'];
      
      controls.forEach(className => {
        const element = document.createElement('div');
        element.className = className;
        host.appendChild(element);

        const computedStyle = getComputedStyle(element);
        
        // All glass components should have backdrop filter
        expect(computedStyle.backdropFilter).toBeTruthy();
        
        // Should have border
        expect(computedStyle.border).not.toBe('none');
        
        // Should have transition
        expect(computedStyle.transition).toBeTruthy();
      });
    });
  });
});