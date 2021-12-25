import { appendLifeLogPageTo } from "./wayfarer-lifelog"

const setDateSpy = (epoch = new Date(2000, 1, 1)) => {
    const oldDate = Date
    let lastDate = new oldDate(epoch)
    const spy = jest
        .spyOn(global, "Date")
        .mockImplementation(() => {
            const current = new oldDate(lastDate)
            current.setSeconds(lastDate.getSeconds() + 1)
            lastDate = new oldDate(current)
            return current as unknown as string
        })
    return () => {
        spy.mockReset()
        spy.mockRestore()
    }
}

const using = async <T>(resource: { dispose(): Promise<void> | void } | (() => (Promise<void> | void)), action: () => Promise<T> | T) => {
    try {
        return await action()
    }
    catch (e) {
        throw e
    }
    finally {
        if (typeof resource === "function") {
            await resource()
        }
        else {
            await resource.dispose()
        }
    }
}

describe("serialization", () => {
    it("2ページ追記", () => using(setDateSpy(), async () => {
        const lifeLogs = {}
        const data = {
            version: "0",
            performance: "good"
        }
        await appendLifeLogPageTo(lifeLogs, "address", { ...data, rewardProgress: 0 })
        await appendLifeLogPageTo(lifeLogs, "address", { ...data, rewardProgress: 1 })

        expect(lifeLogs).toEqual({ "address": [
            {
                utc1: "2000-01-31T15:00:01.000Z",
                utc2: "2000-01-31T15:00:01.000Z",
                data: {
                    version: "0",
                    performance: "good",
                    rewardProgress: 0,
                }
            },
            {
                utc1: "2000-01-31T15:00:02.000Z",
                utc2: "2000-01-31T15:00:02.000Z",
                data: {
                    version: "0",
                    performance: "good",
                    rewardProgress: 1,
                }
            }
        ]})
    }))
    it("同じデータの連続したページはマージ", () => using(setDateSpy(), async () => {
        const logs = {}
        const data = {
            version: "0",
            performance: "good",
            rewardProgress: 0,
        }
        await appendLifeLogPageTo(logs, "address", data)
        await appendLifeLogPageTo(logs, "address", data)

        expect(logs).toEqual({ "address": [
            {
                utc1: "2000-01-31T15:00:01.000Z",
                utc2: "2000-01-31T15:00:02.000Z",
                data: {
                    version: "0",
                    performance: "good",
                    rewardProgress: 0,
                }
            }
        ]})
    }))
})
