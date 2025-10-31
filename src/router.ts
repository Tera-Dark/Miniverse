type Cleanup = () => void | Promise<void>;

type RouteHandlerResult = void | Cleanup | Promise<void | Cleanup>;

export interface RouteContext {
  path: string;
  params: Record<string, string>;
  root: HTMLElement;
}

export type RouteHandler = (context: RouteContext) => RouteHandlerResult;

export interface RouteDefinition {
  path: string;
  handler: RouteHandler;
}

interface RouterOptions {
  root: HTMLElement;
  routes: RouteDefinition[];
  notFound?: RouteHandler;
  onRouteChange?: (path: string) => void;
}

interface CompiledRoute extends RouteDefinition {
  regex: RegExp;
  keys: string[];
}

const normalizePath = (value: string): string => {
  if (!value) return '/';
  const normalized = value.startsWith('/') ? value : `/${value}`;
  const compact = normalized.replace(/\/{2,}/g, '/');
  if (compact !== '/' && compact.endsWith('/')) {
    return compact.slice(0, -1);
  }
  return compact;
};

const getCurrentPath = (): string => {
  const hash = window.location.hash.replace(/^#/, '');
  return normalizePath(hash.length ? hash : '/');
};

const compileRoute = (definition: RouteDefinition): CompiledRoute => {
  const keys: string[] = [];
  const pattern = definition.path
    .replace(/\/$/, '')
    .replace(/:[^/]+/g, (segment) => {
      keys.push(segment.slice(1));
      return '([^/]+)';
    });
  const source = `^${pattern || '/'}$`;
  return {
    ...definition,
    regex: new RegExp(source),
    keys,
  };
};

export function initRouter(options: RouterOptions): () => void {
  const { root, routes, notFound, onRouteChange } = options;
  const compiled = routes.map(compileRoute);
  let activeCleanup: Cleanup | null = null;
  let locked = false;

  const resolveRoute = (path: string) => {
    for (const route of compiled) {
      const match = route.regex.exec(path);
      if (match) {
        const params: Record<string, string> = {};
        route.keys.forEach((key, index) => {
          params[key] = decodeURIComponent(match[index + 1]);
        });
        return { definition: route, params };
      }
    }
    return null;
  };

  const navigate = async () => {
    if (locked) {
      return;
    }
    locked = true;

    try {
      const path = getCurrentPath();
      const match = resolveRoute(path);

      if (activeCleanup) {
        await activeCleanup();
        activeCleanup = null;
      }

      root.replaceChildren();

      let handler: RouteHandler | undefined;
      let params: Record<string, string> = {};

      if (match) {
        handler = match.definition.handler;
        params = match.params;
      } else if (notFound) {
        handler = notFound;
      }

      if (handler) {
        const result = await handler({ path, params, root });
        if (typeof result === 'function') {
          activeCleanup = result;
        }
      } else {
        root.textContent = 'Page not found.';
      }

      onRouteChange?.(path);
    } finally {
      locked = false;
    }
  };

  const start = () => {
    window.addEventListener('hashchange', navigate);
    window.addEventListener('DOMContentLoaded', navigate);
    navigate().catch((error) => console.error('Navigation error', error));
  };

  start();

  return () => {
    window.removeEventListener('hashchange', navigate);
    window.removeEventListener('DOMContentLoaded', navigate);
  };
}
