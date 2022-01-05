export const lazy = <T>(factory: () => T): (() => T) => {
    let hasValue = false;
    let result: T;
    return () =>
        hasValue ? result : ((result = factory()), (hasValue = true), result);
};
