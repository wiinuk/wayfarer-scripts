const privateDateTimeBrand = Symbol("dateTimeBrand");
export interface DateTime {
    [privateDateTimeBrand]: never;
}

const toTime = (date: DateTime) => date as unknown as number;
const ofTime = (time: number) => time as unknown as DateTime;

export const ofDate = (date: Date) => ofTime(date.getTime());

const timeParSeconds = 1000;
const timeParDay = timeParSeconds * 60 * 60 * 24;
const internalTempDate = new Date(0);

export interface Statics {
    now(): DateTime;
}
const originalStatics = {
    now() {
        return ofTime(Date.now());
    },
};
let statics = originalStatics;
const staticsStack: Statics[] = [];
const syncStatics = () =>
    (statics = staticsStack[staticsStack.length - 1] ?? originalStatics);

export const usingDateTimeStatics = async <T>(
    getStatics: (originalImplementation: Statics) => Statics,
    action: () => Promise<T>
) => {
    staticsStack.push(getStatics(originalStatics));
    syncStatics();
    try {
        return await action();
    } finally {
        staticsStack.pop();
        syncStatics();
    }
};

export const now = () => {
    return statics.now();
};

export const parse = (date: string) => ofTime(Date.parse(date));

export const newLocal = (year: number, month: number, day: number) => {
    internalTempDate.setFullYear(year, month, day);
    return ofDate(internalTempDate);
};
export const newUTC = (year: number, month: number, day: number) =>
    ofTime(Date.UTC(year, month, day));

export const addDays = (current: DateTime, days: number) =>
    ofTime(toTime(current) + days * timeParDay);

export const addSeconds = (current: DateTime, seconds: number) =>
    ofTime(toTime(current) + seconds * timeParSeconds);

export const withHours = (
    current: DateTime,
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number
) => {
    internalTempDate.setTime(toTime(current));
    internalTempDate.setHours(hours, minutes, seconds, milliseconds);
    return ofDate(internalTempDate);
};

export const getDayOfWeek = (current: DateTime) => {
    internalTempDate.setTime(toTime(current));
    return internalTempDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

export const toISOString = (date: DateTime) => {
    internalTempDate.setTime(toTime(date));
    return internalTempDate.toISOString();
};
