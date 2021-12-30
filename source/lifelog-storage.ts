import {
    DateTime,
    toISOString,
    withHours,
    now as getNow,
    parse,
} from "./date-time";

type LifeLogs<TData> = { [email: string]: LifeLogPage<TData>[] };

const appendLifeLogPageTo = async <T>(
    lifeLogs: LifeLogs<T>,
    email: string,
    data: T
) => {
    const lifeLog = (lifeLogs[email] ??= []);

    const now = toISOString(getNow());
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
    appendPage(email: string, data: TData): Promise<void>;
    getPagesAtDay(email: string, day: DateTime): Promise<LifeLogPage<TData>[]>;
    logs: AsyncIterable<{
        email: string;
        pages: AsyncIterable<LifeLogPage<TData>>;
    }>;
}

const zeroOClock = (date: DateTime) => withHours(date, 0, 0, 0, 0);
const jsonStorage = <T>(
    saveJson: (json: string) => void,
    loadJson: () => string | null
): LifeLogStorage<T> => {
    return {
        async appendPage(email: string, data: T) {
            const lifeLogs: LifeLogs<T> = JSON.parse(
                loadJson() || JSON.stringify({})
            );
            await appendLifeLogPageTo(lifeLogs, email, data);
            saveJson(JSON.stringify(lifeLogs));
        },
        async getPagesAtDay(email: string, date: DateTime) {
            const lifeLogs: LifeLogs<T> = JSON.parse(
                loadJson() || JSON.stringify({})
            );
            const logs = lifeLogs[email] ?? [];
            const day = zeroOClock(date);
            return logs.filter(
                (page) =>
                    zeroOClock(parse(page.utc1)) === day ||
                    zeroOClock(parse(page.utc2)) === day
            );
        },
        get logs() {
            async function* logs() {
                const lifeLogs: LifeLogs<T> = JSON.parse(
                    loadJson() || JSON.stringify({})
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
        },
    };
};

export const memoryStorage = <T>(): LifeLogStorage<T> => {
    let json: string | null = null;
    return jsonStorage(
        (j) => (json = j),
        () => json
    );
};
export const localStorageStorage = <T>(key: string): LifeLogStorage<T> =>
    jsonStorage(
        (j) => localStorage.setItem(key, j),
        () => localStorage.getItem(key)
    );
