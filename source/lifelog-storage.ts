import { DateTime, Zone } from "luxon";

type LifeLogs<TData> = { [email: string]: LifeLogPage<TData>[] };

const appendLifeLogPageTo = async <T>(
    lifeLogs: LifeLogs<T>,
    email: string,
    date: DateTime,
    data: T
) => {
    const lifeLog = (lifeLogs[email] ??= []);

    const now = date.toISO();
    const newPage: LifeLogPage<T> = {
        utc1: now,
        utc2: now,
        data,
    };

    // 最後のページと新しいページが同じ内容なら、最後のページの日付を更新する
    const lastPage = lifeLog[lifeLog.length - 1];
    if (
        lastPage != null &&
        JSON.stringify(lastPage.data) === JSON.stringify(newPage.data)
    ) {
        lastPage.utc2 = newPage.utc2;
    }
    // 最後のページと新しいページが同じ内容でないなら、新しいページを最後に挿入する
    else {
        lifeLog.push(newPage);
    }
};

export type LifeLogPage<Data> = {
    /** 期間の始め */
    utc1: string;
    /** 期間の終わり */
    utc2: string;
    data: Data;
};
export interface LifeLogStorage<TData> {
    appendPage(email: string, date: DateTime, data: TData): Promise<void>;
    getPagesAtDay(email: string, day: DateTime): Promise<LifeLogPage<TData>[]>;
    logs: AsyncIterable<{
        email: string;
        pages: AsyncIterable<LifeLogPage<TData>>;
    }>;
}

abstract class JsonStorage<T> implements LifeLogStorage<T> {
    protected abstract _protected_saveJson(json: string): void;
    protected abstract _protected_loadJson(): string | null;
    async appendPage(email: string, date: DateTime, data: T) {
        const lifeLogs: LifeLogs<T> = JSON.parse(
            this._protected_loadJson() || JSON.stringify({})
        );
        await appendLifeLogPageTo(lifeLogs, email, date, data);
        this._protected_saveJson(JSON.stringify(lifeLogs));
    }
    async getPagesAtDay(email: string, date: DateTime) {
        const lifeLogs: LifeLogs<T> = JSON.parse(
            this._protected_loadJson() || JSON.stringify({})
        );
        const parseUtcToBeginningOfDay = (
            utcIsoDateString: string,
            timeZone: Zone | undefined
        ) =>
            DateTime.fromISO(utcIsoDateString, { zone: timeZone }).startOf(
                "day"
            );

        const logs = lifeLogs[email] ?? [];
        const day = date.startOf("day");
        const timeZone = date.zone;
        return logs.filter(
            (page) =>
                parseUtcToBeginningOfDay(page.utc1, timeZone).equals(day) ||
                parseUtcToBeginningOfDay(page.utc2, timeZone).equals(day)
        );
    }
    get logs() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        async function* logs() {
            const lifeLogs: LifeLogs<T> = JSON.parse(
                that._protected_loadJson() || JSON.stringify({})
            );
            for (const email in lifeLogs) {
                yield {
                    email,
                    pages: (async function* pages() {
                        yield* lifeLogs[email] ?? [];
                    })(),
                };
            }
        }
        return logs();
    }
}
class MemoryStorage<T> extends JsonStorage<T> {
    private _json: string | null = null;
    protected override _protected_loadJson() {
        return this._json;
    }
    protected override _protected_saveJson(json: string) {
        this._json = json;
    }
}
export const memoryStorage = <T>(): LifeLogStorage<T> => new MemoryStorage<T>();

class LocalStorageStorage<T> extends JsonStorage<T> {
    constructor(private _key: string) {
        super();
    }
    protected override _protected_loadJson() {
        return localStorage.getItem(this._key);
    }
    protected override _protected_saveJson(json: string): void {
        localStorage.setItem(this._key, json);
    }
}
export const localStorageStorage = <T>(key: string): LifeLogStorage<T> =>
    new LocalStorageStorage<T>(key);
