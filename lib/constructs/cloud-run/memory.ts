/**
 * Units of memory to choose from.
 */
export enum MemoryUnit {
  GB = 'Gi',
  MB = 'Mi',
}

/**
 * A helper class for storing memory definitions.
 * @see https://kubernetes.io/docs/concepts/policy/limit-range/
 */
export class Memory {
  /** the amount of memory. */
  private amount: number;

  /** the unit that the amount refers to. */
  private unit: string;

  /**
   * creates a memory object.
   * @param {number} amount the amount of memory to allocate
   * @param {MemoryUnit} unit the unit describing that amount
   */
  constructor(amount: number, unit: MemoryUnit) {
    this.amount = amount;
    this.unit = unit.toString();
  }

  /**
   * Get the stringified memory definition
   * @return {string} the value to be used in a cloud run service definition.
   */
  public toString(): string {
    return `${this.amount}${this.unit}`;
  }

  /**
   * Creates a memory object in megabytes.
   * @param {number} mb how many megabytes.
   * @return {Memory} The memory object in megabytes.
   */
  public static megabytes(mb: number): Memory {
    return new Memory(mb, MemoryUnit.MB);
  }

  /**
   * Get a memory definition in gigabytes.
   * @param {number} gb the amount of gigabytes.
   * @return {Memory} the memory object in gigabytes.
   */
  public static gigabytes(gb: number): Memory {
    return new Memory(gb, MemoryUnit.GB);
  }
}
