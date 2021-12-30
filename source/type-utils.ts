export type primitive = undefined | null | boolean | number | bigint | string;
export type DeepReadonly<T> = T extends primitive
    ? T
    : T extends (infer e)[]
    ? DeepReadonly<e>[]
    : T extends Map<infer k, infer v>
    ? Map<DeepReadonly<k>, DeepReadonly<v>>
    : T extends Set<infer k>
    ? Set<DeepReadonly<k>>
    : T extends object
    ? { readonly [k in keyof T]: DeepReadonly<T[k]> }
    : T;
