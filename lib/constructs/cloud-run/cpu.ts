export enum CpuUnit {
  M = 'm',
  _ = '',
}

/**
 * A helper class for declaring cpu amounts.
 * @see https://kubernetes.io/docs/concepts/policy/limit-range/
 */
export class Cpu {
  /** The amount of cpu to use. */
  private amount: number;

  /** The unit that the amount of CPU is measured in. */
  private unit: string;

  /**
   * Creates a new cpu definition
   * @param {number} amount the amount of cpu.
   * @param {CpuUnit} unit the unit describing the amount of cpu.
   */
  constructor(amount: number, unit: CpuUnit) {
    this.amount = amount;
    this.unit = unit.toString();
  }

  /**
   * Converts the object to its string form.
   * @return {string} the cpu measurement to use.
   */
  public toString(): string {
    return `${this.amount}${this.unit}`;
  }

  /**
   * Creates a CPU definition in "m" units.
   * These are defined as 1 whole cpu == 1000m.
   * @param {number} amount The amount of Cpu to allocate in "m".
   * @return {Cpu} The cpu measured in "m".
   */
  public static m(amount: number): Cpu {
    return new Cpu(amount, CpuUnit.M);
  }

  /**
   * Creates a CPU definition in whole CPU units.
   * @param {number} amount The amount of Cpu to allocate in whole units.
   * @return {Cpu} The cpu measured in whole cpu units.
   */
  public static whole(amount: number): Cpu {
    return new Cpu(amount, CpuUnit._);
  }
}
