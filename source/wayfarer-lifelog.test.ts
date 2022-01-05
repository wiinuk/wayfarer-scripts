import { DateTime } from "luxon";
import {
    LifeLogPage,
    LifeLogStorage as LogStorage,
    memoryStorage,
} from "./lifelog-storage";
import { getDaySummary, LifeLogData, pickLog } from "./wayfarer-lifelog";
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
            const now = DateTime.utc(2000, 1, 1, 0, 0, 1);
            await lifeLogs.appendPage("address", now, {
                ...data,
                rewardProgress: 0,
            });
            await lifeLogs.appendPage("address", now.plus({ seconds: 1 }), {
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
            const now = DateTime.utc(2000, 1, 1, 0, 0, 1);
            await storage.appendPage("address", now, data);
            await storage.appendPage("address", now.plus({ seconds: 1 }), data);
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
    it("日ごとのページ一覧を取得", () =>
        usingMocks(async () => {
            const storage: LifeLogStorage = memoryStorage();
            const data = {
                version: "0",
                performance: "good",
                rewardProgress: 0,
            };
            const email = "address";
            const now = DateTime.utc(2000, 1, 1, 0, 0, 1);
            await storage.appendPage(email, now, data);
            const pages = await storage.getPagesAtDay(
                email,
                now.startOf("day")
            );
            expect(pages).toStrictEqual([
                {
                    utc1: "2000-01-01T00:00:01.000Z",
                    utc2: "2000-01-01T00:00:01.000Z",
                    data,
                },
            ]);
        }));
});
describe("getDaySummary", () => {
    const utc = DateTime.utc;
    const jst = (year: number, month: number, day: number, hour: number) =>
        DateTime.local(year, month, day, hour, {
            zone: "Asia/Tokyo",
        });

    const testProfileData = Object.freeze({
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
    } as const);

    it("差分を計算する", () =>
        usingMocks(async () => {
            const storage: LifeLogStorage = memoryStorage();
            const email = "address";
            const append = (date: DateTime, finished: number) =>
                storage.appendPage(email, date, {
                    ...testProfileData,
                    finished,
                });
            const get = async (day: DateTime) =>
                (await getDaySummary(storage, email, day, 7)).finished;

            await append(utc(2000, 1, 1), 10);
            await append(utc(2000, 1, 2), 15);
            await append(utc(2000, 1, 3), 15);

            expect(await get(utc(2000, 1, 1))).toEqual(0);
            expect(await get(utc(2000, 1, 2))).toEqual(5);
            expect(await get(utc(2000, 1, 3))).toEqual(0);
        }));
    it("記録がない日は前の日の記録から補完する", () =>
        usingMocks(async () => {
            const storage: LifeLogStorage = memoryStorage();
            const email = "address";
            await storage.appendPage(email, utc(2000, 0, 1), testProfileData);

            for (let i = 0; i < 5; i++) {
                const summary = await getDaySummary(
                    storage,
                    email,
                    utc(2000, 0, 2).plus({ days: i }),
                    7
                );
                expect(summary).toEqual({
                    finished: 0,
                });
            }
        }));
    it("記録がない日は前の日の記録から補完する - 2", () =>
        usingMocks(async () => {
            const storage: LifeLogStorage = memoryStorage();
            const email = "address";
            const add = (date: DateTime, finished: number) =>
                storage.appendPage(email, date, {
                    ...testProfileData,
                    finished,
                });

            const days = 7;
            const pickFinished = (day: DateTime) =>
                pickLog(storage, email, day, days, (log) =>
                    log.data.kind === "profile" ? log.data.finished : undefined
                );

            await add(utc(2000, 1, 1), 2);
            await add(utc(2000, 1, 2), 3);
            expect(await pickFinished(utc(2000, 1, 3))).toEqual(3);
        }));

    it("ローカル時間", () =>
        usingMocks(async () => {
            const storage: LifeLogStorage = memoryStorage();
            const email = "address";
            const add = (date: DateTime, finished: number) =>
                storage.appendPage(email, date, {
                    ...testProfileData,
                    finished,
                });

            await add(jst(2021, 12, 29, 22), 20);
            await add(jst(2021, 12, 30, 21), 20);
            await add(jst(2021, 12, 30, 22), 30);
            await add(jst(2022, 1, 1, 22), 30);
            expect(
                (await getDaySummary(storage, email, jst(2021, 12, 30, 0), 7))
                    .finished
            ).toEqual(10);
        }));
});
