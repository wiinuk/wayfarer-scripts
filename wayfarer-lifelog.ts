import { appendChartElement, DayValue, newAddDays } from "./chart-element";
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
const error = (template: TemplateStringsArray, ...substitutions: unknown[]) => {
    throw new Error(String.raw(template, ...substitutions));
};
type Json =
    | null
    | boolean
    | number
    | string
    | Array<Json>
    | { [key: string]: Json };
type JsonWithoutObject = null | boolean | number | string | Array<Json>;
type jsonObjectOrNull<J extends Json | undefined> = J extends
    | JsonWithoutObject
    | undefined
    ? null
    : J;
type toUnknownJson<T> = {
    [P in keyof T]?: T[P] extends JsonWithoutObject
        ? Json
        : toUnknownJson<T[P]>;
};

const asObjectOrNull = <J extends Json | undefined>(jsonOrUndefined: J) =>
    (typeof jsonOrUndefined === "object" && jsonOrUndefined !== null
        ? jsonOrUndefined
        : null) as jsonObjectOrNull<J>;

const asStringOrNull = (x: unknown) => (typeof x === "string" ? x : null);

const asNumberOrNull = (x: unknown) => (typeof x === "number" ? x : null);

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
    const data = JSON.parse(xhr.response);
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

const lifelogStorageKey = "WAYFARER_LIFELOG_";

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

const appendLifeLogPage = async (
    email: string,
    data: DeepReadonly<LifeLogData>
) => {
    const lifeLogs: LifeLogs = JSON.parse(
        localStorage.getItem(lifelogStorageKey) || JSON.stringify({})
    );
    appendLifeLogPageTo(lifeLogs, email, data);
    localStorage.setItem(lifelogStorageKey, JSON.stringify(lifeLogs));
};

const newZeroOClock = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

const getLifeLogPagesAtDay = async (email: string, date: Date) => {
    const lifeLogs: LifeLogs = JSON.parse(
        localStorage.getItem(lifelogStorageKey) || JSON.stringify({})
    );
    const logs = lifeLogs[email] ?? [];
    const day = newZeroOClock(date);
    return logs.filter(
        (page) =>
            newZeroOClock(new Date(page.utc1)) === day ||
            newZeroOClock(new Date(page.utc2)) === day
    );
};

let insertedView: {
    chart: {
        setData: (
            currentDate: Date,
            values: readonly Readonly<DayValue>[]
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
    email: string,
    day: Date,
    retryCount: number
): Promise<DayValue> => {
    if (!(0 < retryCount)) {
        return { finished: 0, agreement: 0 };
    }
    // その日のページ一覧を取得
    const pages = await getLifeLogPagesAtDay(email, day);

    // 最新のページを優先する
    for (let i = pages.length - 1; 0 <= i; i--) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { data } = pages[i]!;
        switch (data.kind) {
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
    return getDayValue(email, newAddDays(day, -1), retryCount - 1);
};

// プロパティを要求したとき
const onGetProperties = async function (this: XMLHttpRequest) {
    // 応答を取得
    const {
        version,
        result: {
            performance,
            rewardProgress,
            socialProfile: { email },
        },
    } = parseResponse(PropertiesResponseSpec, this);

    // 永続記録に追記
    await appendLifeLogPage(email, { version, performance, rewardProgress });

    // グラフを更新
    const values: DayValue[] = [];
    const days = 7;
    const now = new Date();
    for (let i = days - 1; 0 <= i; i--) {
        values.push(await getDayValue(email, newAddDays(now, -i), 7));
    }
    const view = await getInsertedView();
    view.chart.setData(new Date(), values);
};

const onGetProfile = async function (this: XMLHttpRequest) {
    // 応答を取得
    const {
        version,
        result: { accepted },
    } = parseResponse(ProfileResponseSpec, this.response);
};

const handleAsyncError = <TThis>(
    asyncAction: (this: TThis) => Promise<void>
): ((this: TThis) => void) =>
    function () {
        asyncAction.call(this).catch((error: unknown) => {
            console.error(error);
        });
    };

export const main = (global: BrowserGlobal) => {
    injectXHRGet(
        global,
        "/api/v1/vault/properties",
        handleAsyncError(onGetProperties)
    );
    injectXHRGet(
        global,
        "/api/v1/vault/profile",
        handleAsyncError(onGetProfile)
    );
};
