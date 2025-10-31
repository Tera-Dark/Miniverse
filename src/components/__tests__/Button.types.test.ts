import type { createButton } from '../Button';

type ButtonOptions = Parameters<typeof createButton>[0];
type ButtonElement = ReturnType<typeof createButton>;
type ButtonClickHandler = NonNullable<ButtonOptions['onClick']>;

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type HandlerParam = Parameters<ButtonClickHandler>[0];

type _handlerIsMouseEvent = Expect<Equal<HandlerParam, MouseEvent>>;
type _mouseEventHasClientX = Expect<Equal<HandlerParam['clientX'], number>>;
type _elementIsUnion = Expect<Equal<ButtonElement, HTMLButtonElement | HTMLAnchorElement>>;
