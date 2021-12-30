import { now, usingDateTimeStatics, ofDate, toISOString } from "./date-time";

describe("date-time.usingDateTimeStatics", () => {
    const utcDate = (year: number, month: number, day: number) =>
        new Date(Date.UTC(year, month, day));

    const statics = (now: Date) => () => ({
        now() {
            return ofDate(now);
        },
    });
    it("now", () =>
        usingDateTimeStatics(statics(utcDate(2100, 0, 1)), async () => {
            expect(toISOString(now())).toBe(utcDate(2100, 0, 1).toISOString());
            await usingDateTimeStatics(
                statics(utcDate(2200, 0, 1)),
                async () => {
                    expect(toISOString(now())).toBe(
                        utcDate(2200, 0, 1).toISOString()
                    );
                }
            );
            expect(toISOString(now())).toBe(utcDate(2100, 0, 1).toISOString());
        }));
});
