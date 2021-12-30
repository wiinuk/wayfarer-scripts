import { addSeconds, newUTC, usingDateTimeStatics } from "./date-time";
import { appendLifeLogPageTo } from "./wayfarer-lifelog";

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

describe("serialization", () => {
    it("2ページ追記", () =>
        usingMocks(async () => {
            const lifeLogs = {};
            const data = {
                version: "0",
                performance: "good",
            };
            await appendLifeLogPageTo(lifeLogs, "address", {
                ...data,
                rewardProgress: 0,
            });
            await appendLifeLogPageTo(lifeLogs, "address", {
                ...data,
                rewardProgress: 1,
            });

            expect(lifeLogs).toEqual({
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
            const logs = {};
            const data = {
                version: "0",
                performance: "good",
                rewardProgress: 0,
            };
            await appendLifeLogPageTo(logs, "address", data);
            await appendLifeLogPageTo(logs, "address", data);

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
