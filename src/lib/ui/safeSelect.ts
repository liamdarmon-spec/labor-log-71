export function assertNonEmptySelectValue(value: string, label: string) {
  if (import.meta.env.DEV && value === '') {
    throw new Error(`[Select] Empty value is not allowed for ${label}`);
  }
}

export const NONE_VALUE = '__none__';

