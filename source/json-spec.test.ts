import { record, string, number } from "./json-spec";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const assert = <_T extends true>() => {
    /* 型レベルアサーション関数 */
};
type eq<a, b> = [a] extends [b] ? ([b] extends [a] ? true : false) : false;

describe("record.validate { name: { first: string, last: string }, age: number }", () => {
    const _PersonSpec = record({
        name: record({ first: string, last: string }),
        age: number,
    });
    const PersonSpec: typeof _PersonSpec = _PersonSpec;

    it("成功", () => {
        const x: unknown = { name: { first: "a", last: "b" }, age: 123 };
        PersonSpec.validate(x);
        assert<
            eq<typeof x, { name: { first: string; last: string }; age: number }>
        >();
    });
    it("エラー", () => {
        expect(() => PersonSpec.validate(null)).toThrow(
            /^(?=.*{ name: { first: string, last: string }, age: number })(?=.*\$)(?=.*null)/
        );
        expect(() => PersonSpec.validate(true)).toThrow(
            /^(?=.*{ name: { first: string, last: string }, age: number })(?=.*\$)(?=.*true)/
        );
        expect(() => PersonSpec.validate({})).toThrow(/^(?=.*"name")(?=.*\$)/);
        expect(() =>
            PersonSpec.validate({ name: { first: "a", last: "b" } })
        ).toThrow(/^(?=.*"age")(?=.*\$)/);
        expect(() => PersonSpec.validate({ age: 123 })).toThrow(
            /^(?=.*"name")(?=.*\$)/
        );
        expect(() => PersonSpec.validate({ name: "aaa", age: 123 })).toThrow(
            /^(?=.*{ first: string, last: string })(?=.*\$\.name)(?=.*"aaa")/
        );
    });
});
