import { addDays, addSeconds, DateTime, newUTC } from "./date-time";
import {
    LifeLogPage,
    LifeLogStorage as LogStorage,
    memoryStorage,
} from "./lifelog-storage";
import { getDaySummary, LifeLogData } from "./wayfarer-lifelog";
type LifeLogStorage = LogStorage<LifeLogData>;

const usingMocks = <T>(action: () => Promise<T>) => action();

const collectLogs = async <T>(storage: LogStorage<T>) => {
    const logs: { [email: string]: LifeLogPage<T>[] } = Object.create(null);

    for await (const { email, pages } of storage.logs) {
        const pageList = [];
        for await (const page of pages) {
            pageList.push(page);
        }
        logs[email] = pageList;
    }
    return logs;
};

describe("serialization", () => {
    it("2ページ追記", () =>
        usingMocks(async () => {
            const lifeLogs: LifeLogStorage = memoryStorage();
            const data = {
                version: "0",
                performance: "good",
            };
            const now = addSeconds(newUTC(2000, 0, 1), 1);
            await lifeLogs.appendPage("address", now, {
                ...data,
                rewardProgress: 0,
            });
            await lifeLogs.appendPage("address", addSeconds(now, 1), {
                ...data,
                rewardProgress: 1,
            });
            const logs = await collectLogs(lifeLogs);
            expect(logs).toEqual({
                address: [
                    {
                        utc1: "2000-01-01T00:00:01.000Z",
                        utc2: "2000-01-01T00:00:01.000Z",
                        data: {
                            version: "0",
                            performance: "good",
                            rewardProgress: 0,
                        },
                    },
                    {
                        utc1: "2000-01-01T00:00:02.000Z",
                        utc2: "2000-01-01T00:00:02.000Z",
                        data: {
                            version: "0",
                            performance: "good",
                            rewardProgress: 1,
                        },
                    },
                ],
            });
        }));
    it("同じデータの連続したページはマージ", () =>
        usingMocks(async () => {
            const storage: LifeLogStorage = memoryStorage();
            const data = {
                version: "0",
                performance: "good",
                rewardProgress: 0,
            };
            const now = addSeconds(newUTC(2000, 0, 1), 1);
            await storage.appendPage("address", now, data);
            await storage.appendPage("address", addSeconds(now, 1), data);
            const logs = await collectLogs(storage);

            expect(logs).toEqual({
                address: [
                    {
                        utc1: "2000-01-01T00:00:01.000Z",
                        utc2: "2000-01-01T00:00:02.000Z",
                        data: {
                            version: "0",
                            performance: "good",
                            rewardProgress: 0,
                        },
                    },
                ],
            });
        }));
});
describe("getDaySummary", () => {
    it("差分を計算する", () =>
        usingMocks(async () => {
            const storage: LifeLogStorage = memoryStorage();
            const email = "address";
            const data: LifeLogData = {
                version: "0",
                kind: "profile",
                performance: "good",

                finished: 10,
                progress: 0,

                // アグリーメント
                accepted: 1,
                rejected: 2,
                duplicated: 3,

                // アップグレード
                available: 1,
                total: 2,
            };
            const append = (date: DateTime, finished: number) =>
                storage.appendPage(email, date, { ...data, finished });
            const get = async (date: DateTime) =>
                (await getDaySummary(storage, email, date, 7)).finished;

            await append(newUTC(2000, 0, 1), 10);
            await append(newUTC(2000, 0, 2), 15);
            await append(newUTC(2000, 0, 3), 15);

            expect(await get(newUTC(2000, 0, 1))).toEqual(0);
            expect(await get(newUTC(2000, 0, 2))).toEqual(5);
            expect(await get(newUTC(2000, 0, 3))).toEqual(0);
        }));
    it("記録がない日は前の日の記録から補完する", () =>
        usingMocks(async () => {
            const storage: LifeLogStorage = memoryStorage();
            const email = "address";
            const data: LifeLogData = {
                version: "0",
                kind: "profile",
                performance: "good",

                finished: 10,
                progress: 0,

                // アグリーメント
                accepted: 1,
                rejected: 2,
                duplicated: 3,

                // アップグレード
                available: 1,
                total: 2,
            };
            await storage.appendPage(email, newUTC(2000, 0, 1), data);

            for (let i = 0; i < 5; i++) {
                const summary = await getDaySummary(
                    storage,
                    email,
                    addDays(newUTC(2000, 0, 2), i),
                    7
                );
                expect(summary).toEqual({
                    finished: 0,
                });
            }
        }));
});
