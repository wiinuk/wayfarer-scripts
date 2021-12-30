import { addSeconds, newUTC, usingDateTimeStatics } from "./date-time";
import { LifeLogPage, LifeLogStorage, memoryStorage } from "./lifelog-storage";
import { LifeLogData } from "./wayfarer-lifelog";

const getDateTimeStatics = ({ epoch = newUTC(2000, 0, 1) } = {}) => {
    return {
        _current: addSeconds(epoch, 1),
        now() {
            const now = this._current;
            this._current = addSeconds(this._current, 1);
            return now;
        },
    };
};
const usingMocks = <T>(action: () => Promise<T>) =>
    usingDateTimeStatics(() => getDateTimeStatics(), action);

const collectLogs = async <T>(storage: LifeLogStorage<T>) => {
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
            const lifeLogs: LifeLogStorage<LifeLogData> = memoryStorage();
            const data = {
                version: "0",
                performance: "good",
            };
            await lifeLogs.appendPage("address", {
                ...data,
                rewardProgress: 0,
            });
            await lifeLogs.appendPage("address", {
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
            const storage: LifeLogStorage<LifeLogData> = memoryStorage();
            const data = {
                version: "0",
                performance: "good",
                rewardProgress: 0,
            };
            await storage.appendPage("address", data);
            await storage.appendPage("address", data);
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
