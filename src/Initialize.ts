const INITIALIZERS = Symbol("initializers");

/**
 * Marks a method to be run once at start-up
 */
export function Initialize(target: object, propertyKey: string): void {
  const holder = target as { [INITIALIZERS]?: string[] };
  // copied rather than appended to, so a subclass never pushes into a list its parent shares
  if (!Object.hasOwn(holder, INITIALIZERS)) {
    holder[INITIALIZERS] = [...(holder[INITIALIZERS] ?? [])];
  }
  holder[INITIALIZERS]!.push(propertyKey);
}

export namespace Initialize {
  /**
   * Plural, because a single component can have multiple @Initialize decorators
   */
  export async function runAll(instance: object): Promise<void> {
    const marked = (instance as { [INITIALIZERS]?: string[] })[INITIALIZERS] ?? [];
    for (const method of marked) {
      await (instance as Record<string, () => unknown>)[method]!();
    }
  }
}
