type ObjectPath = (number | string)[];
const internalPathCache: ObjectPath = [];

export abstract class Spec<T> {
    abstract readonly imitation: T;
    /** @internal */
    abstract _internal_validateCore(
        value: unknown,
        path: ObjectPath
    ): asserts value is T;
    /** @internal */
    abstract _internal_typeExpr: string;
    validate(value: unknown): asserts value is T {
        try {
            this._internal_validateCore(value, internalPathCache);
        } finally {
            internalPathCache.length = 0;
        }
    }
}
const showObject = (value: unknown) => JSON.stringify(value) ?? String(value);

const showFullObjectPath = (path: Readonly<ObjectPath>) => {
    let result = "$";
    for (const x of path) {
        result += "." + String(x);
    }
    return result;
};

const showTypeMismatchMessage = (
    expectedType: string,
    actualValue: unknown,
    path: Readonly<ObjectPath>
) =>
    `Expected ${expectedType}. actual: ${showObject(
        actualValue
    )}. at: ${showFullObjectPath(path)}`;

const showPropertyNotFoundMessage = (
    expectedKey: string,
    path: Readonly<ObjectPath>
) => `Expected property "${expectedKey}". at: ${showFullObjectPath(path)}`;

export const string: Spec<string> = new (class StringSpec extends Spec<string> {
    override _internal_validateCore(value: unknown, path: ObjectPath) {
        if (typeof value !== "string") {
            throw new Error(showTypeMismatchMessage("string", value, path));
        }
    }
    override _internal_typeExpr = "string";
    override imitation = "";
})();

export const number: Spec<number> = new (class NumberSpec extends Spec<number> {
    override _internal_validateCore(value: unknown, path: ObjectPath) {
        if (typeof value !== "number") {
            throw new Error(
                showTypeMismatchMessage(this._internal_typeExpr, value, path)
            );
        }
    }
    override _internal_typeExpr = "number";
    override imitation = 0;
})();

export type PropertySpecs<Record> = {
    [K in keyof Record]: Spec<Record[K]>;
};

const hasOwnProperty = Object.prototype.hasOwnProperty;
class RecordSpec<Record extends { [k: string]: unknown }> extends Spec<Record> {
    constructor(private readonly _propertySpecs: PropertySpecs<Record>) {
        super();
    }
    override get imitation() {
        const result: Record = Object.create(null);
        const propertySpecs = this._propertySpecs;
        for (const key in propertySpecs) {
            if (hasOwnProperty.call(propertySpecs, key)) {
                result[key] = propertySpecs[key].imitation;
            }
        }
        return result;
    }
    override get _internal_typeExpr() {
        const propertySpecs = this._propertySpecs;
        const properties = [];
        for (const key in propertySpecs) {
            if (hasOwnProperty.call(propertySpecs, key)) {
                properties.push(
                    `${key}: ${propertySpecs[key]._internal_typeExpr}`
                );
            }
        }
        return `{ ${properties.join(", ")} }`;
    }
    override _internal_validateCore(
        value: unknown,
        path: ObjectPath
    ): asserts value is Record {
        if (typeof value !== "object" || value === null) {
            throw new Error(
                showTypeMismatchMessage(this._internal_typeExpr, value, path)
            );
        }
        const propertySpecs = this._propertySpecs;
        for (const key in propertySpecs) {
            if (!(key in value)) {
                throw new Error(showPropertyNotFoundMessage(key, path));
            }
            const x: Spec<unknown> = propertySpecs[key];
            path.push(key);
            x._internal_validateCore(
                (value as { [k: string]: unknown })[key],
                path
            );
            path.pop();
        }
    }
}
export const record = <Record extends { [k: string]: unknown }>(
    propertySpecs: PropertySpecs<Record>
): Spec<Record> => {
    return new RecordSpec(propertySpecs);
};
