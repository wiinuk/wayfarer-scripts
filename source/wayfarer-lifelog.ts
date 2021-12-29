import { appendChartElement, DaySummary, newAddDays } from "./chart-element";
import { range } from "./array-extensions";
import * as V from "./json-spec";

type primitive = undefined | null | boolean | number | bigint | string;
type DeepReadonly<T> = T extends primitive
    ? T
    : T extends (infer e)[]
    ? DeepReadonly<e>[]
    : T extends Map<infer k, infer v>
    ? Map<DeepReadonly<k>, DeepReadonly<v>>
    : T extends Set<infer k>
    ? Set<DeepReadonly<k>>
    : T extends object
    ? { readonly [k in keyof T]: DeepReadonly<T[k]> }
    : T;

interface BrowserGlobal {
    readonly XMLHttpRequest: typeof XMLHttpRequest;
}

const injectXHRGet = (
    { XMLHttpRequest }: BrowserGlobal,
    targetUrl: string | URL,
    onGet: {
        (
            this: XMLHttpRequest,
            ev: ProgressEvent<XMLHttpRequestEventTarget>
        ): void;
    }
) => {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        if (url === targetUrl && method === "GET") {
            this.addEventListener("load", onGet, false);
        }
        // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-explicit-any
        originalOpen.apply(this, arguments as any);
    };
};
const sleep = (milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const waitElement = async (
    selectors: string,
    retryCount = 10,
    intervalMilliseconds = 1000
) => {
    retryCount = Math.trunc(Math.max(0, retryCount));

    for (let i = 0; i < retryCount; i++) {
        const element = document.querySelector(selectors);
        if (element) {
            return element;
        }
        await sleep(intervalMilliseconds);
    }
    throw new Error("Element not found");
};

const ResponseSpec = <T>(T: V.Spec<T>) =>
    V.record({
        result: T,
        version: V.string, // "4.4.28" など
    });

const PropertiesResultSpec = V.record({
    performance: V.string, // "great" など
    rewardProgress: V.number, // 89 など
    socialProfile: V.record({
        email: V.string, // "name@server.com" など
    }),
});
const _PropertiesResponseSpec = ResponseSpec(PropertiesResultSpec);
const PropertiesResponseSpec: typeof _PropertiesResponseSpec =
    _PropertiesResponseSpec;

const ProfileResultSpec = V.record({
    /**
     * Wayfarer 評価。"great"・"good" など
     */
    performance: V.string,
    /** 審査済の候補 */
    finished: V.number,
    /** アグリーメント - 承認した候補 */
    accepted: V.number,
    /** アグリーメント - 否認した候補 */
    rejected: V.number,
    /** アグリーメント - 重複した候補 */
    duplicated: V.number,
    /** 自分が審査済みの候補のうち、他のユーザーが審査中の候補？ */
    progress: V.number,
    /** アップグレード - 利用可能なアップグレード */
    available: V.number,
    /** アップグレード - 適用したアップグレード */
    total: V.number,
});
type ProfileResult = typeof ProfileResultSpec.imitation;
const _ProfileResponseSpec = ResponseSpec(ProfileResultSpec);
const ProfileResponseSpec: typeof _ProfileResponseSpec = _ProfileResponseSpec;

const parseResponse = <T>(spec: V.Spec<T>, xhr: XMLHttpRequest) => {
    let data;
    try {
        data = JSON.parse(xhr.response);
    } catch (e) {
        throw new Error(`JSON の解析に失敗しました。${xhr.response}`);
    }
    spec.validate(data);
    return data;
};

type PropertiesLog = {
    kind?: undefined;
    version: string;
    performance: string;
    rewardProgress: number;
};
type ProfileLog = ProfileResult & {
    kind: "profile";
    version: string;
};
type LifeLogData = PropertiesLog | ProfileLog;
type LifeLogPage = {
    /** 期間の始め */
    utc1: string;
    /** 期間の終わり */
    utc2: string;
    data: LifeLogData;
};
type LifeLog = LifeLogPage[];
type LifeLogs = { [email: string]: LifeLog };

export const appendLifeLogPageTo = async (
    lifeLogs: LifeLogs,
    email: string,
    data: DeepReadonly<LifeLogData>
) => {
    const lifeLog = (lifeLogs[email] ??= []);

    const now = new Date().toISOString();
    const newPage = {
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

interface LifeLogStorage {
    appendPage(email: string, data: DeepReadonly<LifeLogData>): Promise<void>;
    getPagesAtDay(email: string, day: Date): Promise<LifeLogPage[]>;
    logs(): AsyncIterable<{
        email: string;
        pages: AsyncIterable<LifeLogPage>;
    }>;
}

const localStorageStorage = (key: string): LifeLogStorage => {
    return {
        async appendPage(email: string, data: DeepReadonly<LifeLogData>) {
            const lifeLogs: LifeLogs = JSON.parse(
                localStorage.getItem(key) || JSON.stringify({})
            );
            await appendLifeLogPageTo(lifeLogs, email, data);
            localStorage.setItem(key, JSON.stringify(lifeLogs));
        },
        async getPagesAtDay(email: string, date: Date) {
            const lifeLogs: LifeLogs = JSON.parse(
                localStorage.getItem(key) || JSON.stringify({})
            );
            const logs = lifeLogs[email] ?? [];
            const day = newZeroOClock(date);
            return logs.filter(
                (page) =>
                    newZeroOClock(new Date(page.utc1)).getTime() ===
                        day.getTime() ||
                    newZeroOClock(new Date(page.utc2)).getTime() ===
                        day.getTime()
            );
        },
        async *logs() {
            const lifeLogs: LifeLogs = JSON.parse(
                localStorage.getItem(key) || JSON.stringify({})
            );
            for (const email in lifeLogs) {
                yield {
                    email,
                    pages: (async function* pages() {
                        yield* lifeLogs[email] ?? [];
                    })(),
                };
            }
        },
    };
};

const newZeroOClock = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

let insertedView: {
    chart: {
        setData: (
            currentDate: Date,
            values: readonly Readonly<DaySummary>[]
        ) => void;
    };
} | null = null;

const getInsertedView = async () => {
    if (insertedView != null) {
        return insertedView;
    }

    // グラフの親要素の表示を待つ
    const parentElement = await waitElement("wf-header > div");

    // 要素を作成
    const containerElement = document.createElement("div");
    {
        const { style } = containerElement;
        style.display = "flex";
        style.flexDirection = "row";
        style.boxSizing = "border-box";
        style.height = "100%";
        style.width = "10em";
        // style.padding = "1em"
        style.border = "solid 1px #ccc";
        style.borderRadius = "0.5em";
    }
    const canvasElement = document.createElement("canvas");
    containerElement.appendChild(canvasElement);
    const chart = appendChartElement(canvasElement);

    parentElement.insertBefore(
        containerElement,
        parentElement.querySelector(":scope > a")
    );
    return (insertedView = { chart });
};
const exhaustiveCheck = (x: never): never => {
    throw new Error(`Unexpected value. ${JSON.stringify(x)}`);
};

// 日ごとの値を集計する
const getDayValue = async (
    storage: LifeLogStorage,
    email: string,
    day: Date,
    retryCount: number
): Promise<DaySummary> => {
    if (!(0 < retryCount)) {
        return { finished: 0, agreement: 0 };
    }
    // その日のページ一覧を取得
    const pages = await storage.getPagesAtDay(email, day);

    // 最新のページを優先する
    for (let i = pages.length - 1; 0 <= i; i--) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { data } = pages[i]!;

        switch (data.kind) {
            // property
            case undefined: {
                break;
            }
            case "profile": {
                return {
                    finished: data.finished,
                    agreement: data.accepted + data.rejected + data.duplicated,
                };
            }
            default: {
                exhaustiveCheck(data);
            }
        }
    }
    // 見つからなかったので前の日を検索する
    return getDayValue(storage, email, newAddDays(day, -1), retryCount - 1);
};

const onNewLog = async (
    storage: LifeLogStorage,
    email: string,
    log: DeepReadonly<LifeLogData>
) => {
    // 永続記録に追記
    await storage.appendPage(email, log);

    // グラフを更新
    const now = new Date();
    const days = 7;
    const daySummaries = await Promise.all(
        range(days).map((i) =>
            getDayValue(storage, email, newAddDays(now, -i), 7)
        )
    );
    const view = await getInsertedView();
    view.chart.setData(now, daySummaries);
};

let lastEmail: string | null = null;
// プロパティを要求したとき
const onGetProperties = (storage: LifeLogStorage) =>
    async function (this: XMLHttpRequest) {
        // 応答を取得
        const {
            version,
            result: {
                performance,
                rewardProgress,
                socialProfile: { email },
            },
        } = parseResponse(PropertiesResponseSpec, this);

        lastEmail = email;
        await onNewLog(storage, email, {
            version,
            performance,
            rewardProgress,
        });
    };

const onGetProfile = (storage: LifeLogStorage) =>
    async function (this: XMLHttpRequest) {
        if (lastEmail == null) {
            return;
        }

        // 応答を取得
        const {
            version,
            result: {
                performance,
                finished,
                accepted,
                rejected,
                duplicated,
                progress,
                available,
                total,
            },
        } = parseResponse(ProfileResponseSpec, this);

        await onNewLog(storage, lastEmail, {
            kind: "profile",
            version,
            performance,
            finished,
            accepted,
            rejected,
            duplicated,
            progress,
            available,
            total,
        });
    };

const handleAsyncError = <TThis>(
    asyncAction: (this: TThis) => Promise<void>
): ((this: TThis) => void) =>
    function () {
        asyncAction.call(this).catch((error: unknown) => {
            console.error(error);
        });
    };

const lifelogStorageKey = "WAYFARER_LIFELOG_";
export const main = (global: BrowserGlobal) => {
    const storage = localStorageStorage(lifelogStorageKey);

    injectXHRGet(
        global,
        "/api/v1/vault/properties",
        handleAsyncError(onGetProperties(storage))
    );
    injectXHRGet(
        global,
        "/api/v1/vault/profile",
        handleAsyncError(onGetProfile(storage))
    );
};
