// plural(1, "byte") -> "1 byte", plural(8, "byte") -> "8 bytes"
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}