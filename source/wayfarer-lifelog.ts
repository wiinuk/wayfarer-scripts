import { appendChartElement } from "./chart-element";
import { range } from "./array-extensions";
import * as V from "./json-spec";
import {
    LifeLogPage,
    LifeLogStorage as LogStorage,
    localStorageStorage,
} from "./lifelog-storage";
import { DeepReadonly } from "./type-utils";
import { error, sleep } from "./standard-extensions";
import { lazy } from "./lazy";
// spell-checker: ignore luxon
import { DateTime } from "luxon";

interface BrowserGlobal {
    readonly XMLHttpRequest: typeof XMLHttpRequest;
}

const injectXHRGet = (
    XMLHttpRequest: typeof globalThis.XMLHttpRequest,
    targetUrl: string,
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

const parseResponse = <T>(spec: V.Spec<T>, responseJson: string) => {
    let data;
    try {
        data = JSON.parse(responseJson);
    } catch (e) {
        throw new Error(`JSON の解析に失敗しました。${responseJson}`);
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
export type LifeLogData = PropertiesLog | ProfileLog;
type LifeLogStorage = LogStorage<DeepReadonly<LifeLogData>>;

const insertedView = lazy(async () => {
    // グラフの親要素の表示を待つ
    const parentElement = await waitElement(
        "wf-header > div",
        Number.MAX_SAFE_INTEGER
    );

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
    parentElement.insertBefore(
        containerElement,
        parentElement.querySelector(":scope > a")
    );
    return { chart: appendChartElement(canvasElement) };
});

const exhaustiveCheck = (x: never): never => {
    throw new Error(`Unexpected value. ${JSON.stringify(x)}`);
};

export const pickLog = async <T, U>(
    storage: LogStorage<T>,
    email: string,
    day: DateTime,
    retryCount: number,
    picker: (log: LifeLogPage<T>) => U | undefined
): Promise<U | undefined> => {
    if (!(0 < retryCount)) {
        return;
    }
    // その日のページ一覧を取得
    const pages = await storage.getPagesAtDay(email, day);

    // 最新のページを優先する
    for (let i = pages.length - 1; 0 <= i; i--) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const result = picker(pages[i]!);
        if (result !== undefined) {
            return result;
        }
    }
    // 見つからなかったので前の日を検索する
    return pickLog(
        storage,
        email,
        day.plus({ days: -1 }),
        retryCount - 1,
        picker
    );
};

export const getDaySummary = async (
    storage: LifeLogStorage,
    email: string,
    day: DateTime,
    retryCount: number
) => {
    const pick = ({ data }: LifeLogPage<LifeLogData>) => {
        switch (data.kind) {
            // property
            case undefined: {
                break;
            }
            case "profile": {
                return data.finished;
            }
            default: {
                exhaustiveCheck(data);
            }
        }
    };
    const todayData = await pickLog(storage, email, day, retryCount, pick);
    const yesterdayData = await pickLog(
        storage,
        email,
        day.plus({ days: -1 }),
        retryCount,
        pick
    );

    if (todayData !== undefined && yesterdayData !== undefined) {
        return { finished: todayData - yesterdayData };
    }
    return { finished: 0 };
};

const updateChart = async (
    storage: LifeLogStorage,
    email: string,
    now: DateTime
) => {
    const days = 7;
    const daySummaries = await Promise.all(
        range(days).map((i) =>
            getDaySummary(
                storage,
                email,
                now.plus({ days: -days + 1 + i }),
                days
            )
        )
    );
    const view = await insertedView();
    view.chart.setData(now, daySummaries);
};

const onNewLog = async (
    storage: LifeLogStorage,
    email: string,
    log: DeepReadonly<LifeLogData>
) => {
    const now = DateTime.local();

    // 永続記録に追記
    await storage.appendPage(email, now, log);

    // グラフを更新
    await updateChart(storage, email, now);
};

let lastEmail: string | null = null;
// プロパティを要求したとき
const onGetProperties = async (
    storage: LifeLogStorage,
    responseJson: string
) => {
        // 応答を取得
        const {
            version,
            result: {
                performance,
                rewardProgress,
                socialProfile: { email },
            },
    } = parseResponse(PropertiesResponseSpec, responseJson);

        lastEmail = email;
        await onNewLog(storage, email, {
            version,
            performance,
            rewardProgress,
        });
    };

const onGetProfile = async (storage: LifeLogStorage, responseJson: string) => {
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
    } = parseResponse(ProfileResponseSpec, responseJson);

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

const lifelogStorageKey = "WAYFARER_LIFELOG_";
export const main = ({ XMLHttpRequest }: BrowserGlobal) => {
    const storage: LifeLogStorage = localStorageStorage(lifelogStorageKey);
    const toOnload = (
        handler: (
            storage: LifeLogStorage,
            responseJson: string
        ) => Promise<void>
    ) =>
        function (this: XMLHttpRequest) {
            try {
                handler(storage, this.responseText).catch((error: unknown) => {
            console.error(error);
        });
            } catch (error) {
                console.error(error);
            }
    };

    injectXHRGet(
        XMLHttpRequest,
        "/api/v1/vault/properties",
        toOnload(onGetProperties)
    );
    injectXHRGet(
        XMLHttpRequest,
        "/api/v1/vault/profile",
        toOnload(onGetProfile)
    );
};
