import type { ErrorHandlerLoader } from '../../inherited/error/runtime.tsx';

/** 継承 error.tsx の末尾に global-error.tsx を加える。 */
export function withGlobalError(
  inherited: readonly ErrorHandlerLoader[] | undefined,
  globalError: ErrorHandlerLoader | undefined
): ErrorHandlerLoader[] {
  return [
    ...(inherited ?? []),
    ...(globalError === undefined ? [] : [globalError]),
  ];
}
