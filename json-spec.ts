type ObjectPath = (number | string)[];
const uniquePath: ObjectPath = [];

export abstract class Spec<T> {
    abstract readonly imitation: T;
    abstract _validateCore(
        value: unknown,
        path: ObjectPath
    ): asserts value is T;

    validate(value: unknown): asserts value is T {
        uniquePath.length = 0;
        this._validateCore(value, uniquePath);
    }
}
export const string: Spec<string> = new (class StringSpec extends Spec<string> {
    override _validateCore(value: unknown, path: ObjectPath) {
        if (typeof value !== "string") {
            throw new Error(
                `Expected string. actual: ${value}. at: ${path.join(".")}`
            );
        }
    }
    override get imitation() {
        return "";
    }
})();

export const number: Spec<number> = new (class NumberSpec extends Spec<number> {
    override _validateCore(value: unknown, path: ObjectPath) {
        if (typeof value !== "number") {
            throw new Error(
                `Expected number. actual: ${value}. at: ${path.join(".")}`
            );
        }
    }
    override get imitation() {
        return 0;
    }
})();

class RecordSpec<
    Specs extends { [k: string]: Spec<unknown> }
> extends Spec<Specs> {
    constructor(private readonly _propertySpecs: Specs) {
        super();
    }
    override get imitation() {
        const result = Object.create(null);
        const propertySpecs = this._propertySpecs;
        for (const key in propertySpecs) {
            if (Object.prototype.hasOwnProperty.call(propertySpecs, key)) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                result[key] = propertySpecs[key]!.imitation;
            }
        }
        return result;
    }
    override _validateCore(
        value: unknown,
        path: ObjectPath
    ): asserts value is Specs {
        if (typeof value !== "object" || value === null) {
            throw new Error(
                `Expected object. actual: ${value}, at: ${path.join(".")}`
            );
        }
        const propertySpecs = this._propertySpecs;
        for (const key in propertySpecs) {
            if (!(key in value)) {
                throw new Error(`Expected property "${key}"`);
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const x: Spec<unknown> = propertySpecs[key]!;
            path.push(key);
            x._validateCore((value as { [k: string]: unknown })[key], path);
            path.pop();
        }
    }
}
export const record = <Specs extends { [k: string]: Spec<unknown> }>(
    propertySpecs: Specs
): Spec<{
    readonly [K in keyof Specs]: Specs[K] extends Spec<infer P> ? P : never;
}> => {
    return new RecordSpec(propertySpecs);
};
