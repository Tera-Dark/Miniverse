type RouteParams = Record<string, string>;

type RouteHandler = (ctx: { path: string; params: RouteParams }) => void | (() => void);

type RouteSubscriber = (path: string) => void;

interface CompiledRoute {
  originalPath: string;
  matcher: RegExp;
  paramKeys: string[];
  handler: RouteHandler;
}

const escapeSegment = (segment: string): string =>
  segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizePath = (value: string): string => {
  if (!value) {
    return '/';
  }

  let next = value.startsWith('/') ? value : `/${value}`;

  if (next.length > 1 && next.endsWith('/')) {
    next = next.replace(/\/+$/, '');
  }

  return next || '/';
};

export class HashRouter {
  private routes: CompiledRoute[] = [];

  private notFoundHandler: RouteHandler | null = null;

  private cleanup: (() => void) | null = null;

  private subscribers: RouteSubscriber[] = [];

  private boundHandler = () => this.handle();

  register(path: string, handler: RouteHandler): void {
    const normalized = normalizePath(path);
    const { matcher, paramKeys } = this.compile(normalized);

    this.routes.push({
      originalPath: normalized,
      matcher,
      paramKeys,
      handler
    });
  }

  setNotFound(handler: RouteHandler): void {
    this.notFoundHandler = handler;
  }

  onChange(subscriber: RouteSubscriber): () => void {
    this.subscribers.push(subscriber);

    return () => {
      this.subscribers = this.subscribers.filter((item) => item !== subscriber);
    };
  }

  start(): void {
    window.addEventListener('hashchange', this.boundHandler);

    if (!window.location.hash) {
      this.navigate('/');
      return;
    }

    this.handle();
  }

  stop(): void {
    window.removeEventListener('hashchange', this.boundHandler);
  }

  navigate(path: string): void {
    const normalized = normalizePath(path);
    const nextHash = `#${normalized}`;

    if (window.location.hash === nextHash) {
      this.handle();
      return;
    }

    window.location.hash = nextHash;
  }

  private notify(path: string): void {
    this.subscribers.forEach((subscriber) => subscriber(path));
  }

  private compile(path: string): { matcher: RegExp; paramKeys: string[] } {
    const paramKeys: string[] = [];
    const trimmed = path.replace(/^\//, '');
    const segments = trimmed ? trimmed.split('/') : [];

    if (segments.length === 0) {
      return { matcher: /^\/$/, paramKeys };
    }

    const pattern = segments
      .map((segment) => {
        if (segment.startsWith(':')) {
          paramKeys.push(segment.slice(1));
          return '([^/]+)';
        }

        return escapeSegment(segment);
      })
      .join('/');

    return {
      matcher: new RegExp(`^/${pattern}$`),
      paramKeys
    };
  }

  private handle(): void {
    const current = normalizePath(window.location.hash.replace(/^#/, ''));

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }

    for (const route of this.routes) {
      const match = route.matcher.exec(current);

      if (!match) {
        continue;
      }

      const params: RouteParams = {};

      route.paramKeys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1]);
      });

      const result = route.handler({
        path: current,
        params
      });

      this.cleanup = typeof result === 'function' ? result : null;

      this.notify(current);
      return;
    }

    if (this.notFoundHandler) {
      const result = this.notFoundHandler({ path: current, params: {} });
      this.cleanup = typeof result === 'function' ? result : null;
      this.notify(current);
    }
  }
}
