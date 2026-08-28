const latinScript = /\p{Script=Latin}/u;

export function containsLatinScript(value: string): boolean {
  return latinScript.test(value);
}

export function isCyrillicContent(values: string[]): boolean {
  return values.every((value) => !containsLatinScript(value));
}
