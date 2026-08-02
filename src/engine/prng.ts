export function Mash() {
  let n = 0xefc8249d;

  const mash = (data: string | number | object) => {
    const str = data.toString();
    for (let i = 0; i < str.length; i++) {
      n += str.charCodeAt(i);
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  return mash;
}

export interface PRNG {
  (): number;
  uint32: () => number;
  fract53: () => number;
  args: any[];
  state: (newState?: [number, number, number, number]) => [number, number, number, number];
}

export function Alea(...initialArgs: any[]): PRNG {
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let c = 1;

  let args = initialArgs.length ? initialArgs : [+new Date()];
  let mash: ReturnType<typeof Mash> | null = Mash();
  s0 = mash(' ');
  s1 = mash(' ');
  s2 = mash(' ');

  for (let i = 0; i < args.length; i++) {
    s0 -= mash(args[i]);
    if (s0 < 0) s0 += 1;
    s1 -= mash(args[i]);
    if (s1 < 0) s1 += 1;
    s2 -= mash(args[i]);
    if (s2 < 0) s2 += 1;
  }
  mash = null;

  const random = (() => {
    const t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
    s0 = s1;
    s1 = s2;
    return (s2 = t - (c = t | 0));
  }) as PRNG;

  random.uint32 = () => random() * 0x100000000; // 2^32
  random.fract53 = () => random() + ((random() * 0x200000) | 0) * 1.1102230246251565e-16;
  random.args = args;
  random.state = (newState?: [number, number, number, number]) => {
    if (newState) {
      s0 = newState[0];
      s1 = newState[1];
      s2 = newState[2];
      c = newState[3];
    }
    return [s0, s1, s2, c];
  };

  return random;
}

export class RandomGenerator {
  private prng: PRNG;

  constructor(seed?: any) {
    this.prng = Alea(seed ?? Date.now());
  }

  public random(n: number): number {
    return Math.floor(this.prng.uint32() % n);
  }

  public pick<T>(arr: T[]): T {
    return arr[this.random(arr.length)];
  }

  public getState(): [number, number, number, number] {
    return this.prng.state();
  }

  public setState(state: [number, number, number, number]): void {
    this.prng.state(state);
  }
}
