export const sleep = (milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const error = (
    template: TemplateStringsArray,
    ...substitutions: unknown[]
) => {
    throw new Error(String.raw(template, ...substitutions));
};
export const errorIfNull = <T>(value: T): NonNullable<T> =>
    value ?? error`Value is null or undefined`;
