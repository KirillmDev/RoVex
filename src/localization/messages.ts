export function message(key: string, english: string, ...values: string[]): string {
  return (
    globalThis.chrome?.i18n?.getMessage(key, values) ||
    english.replace(/\$([1-9])/g, (token, index: string) => values[Number(index) - 1] ?? token)
  );
}

export function featureMessage(id: string, field: string, english: string) {
  return message(`feature_${id.replaceAll('-', '_')}_${field.replaceAll('-', '_')}`, english);
}
