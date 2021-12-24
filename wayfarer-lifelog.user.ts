// ==UserScript==
// @name         Wayfarer Lifelog
// @namespace    https://github.com/wiinuk/wayfarer-scripts
// @updateURL    https://github.com/wiinuk/wayfarer-scripts/raw/master/wayfarer-lifelog.user.js
// @homepageURL  https://github.com/wiinuk/wayfarer-scripts
// @version      0.1
// @description  Add LifeLog to Wayfarer
// @author       Wiinuk
// @match        https://wayfarer.nianticlabs.com/*
// @icon         https://www.google.com/s2/favicons?domain=nianticlabs.com
// @grant        none
// ==/UserScript==

export {}

const injectXHRGet = (targetUrl: string | URL, onGet: { (this: XMLHttpRequest, ev: ProgressEvent<XMLHttpRequestEventTarget>): void; }) => {
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        if (url === targetUrl && method === 'GET') {
            this.addEventListener('load', onGet, false);
        }
        open.apply(this, arguments as any);
    }
}
const sleep = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));

const waitElement = async (selectors: string, retryCount = 10, intervalMilliseconds = 1000) => {
    retryCount = Math.trunc(Math.max(0, retryCount));

    for (let i = 0; i < retryCount; i++) {
        const element = document.querySelector(selectors)
        if (element) { return element }
        await sleep(intervalMilliseconds);
    }
    throw new Error('Element not found');
}
const error = (template: TemplateStringsArray, ...substitutions: unknown[]) => {
    throw new Error(String.raw(template, ...substitutions));
}
type Json = null | boolean | number | string | Array<Json> | { [key: string]: Json };
type JsonWithoutObject = null | boolean | number | string | Array<Json>;
type jsonObjectOrNull<J extends Json | undefined> = J extends JsonWithoutObject | undefined ? null : J;
type toUnknownJson<T> = { [P in keyof T]?: T[P] extends JsonWithoutObject ? Json : toUnknownJson<T[P]> };

const asObjectOrNull = <J extends Json | undefined>(jsonOrUndefined: J) =>
    (typeof jsonOrUndefined === "object" && jsonOrUndefined !== null ? jsonOrUndefined : null) as jsonObjectOrNull<J>;

const asStringOrNull = (x: unknown) =>
    typeof x === "string" ? x : null;

const asNumberOrNull = (x: unknown) =>
    typeof x === "number" ? x : null;

type KnownProfile = {
    performance: "great" // "great" など
    rewardProgress: number // 89 など
    socialProfile: {
        email: string // "name@server.com" など
    }
}
type KnownResponse<T> = {
    result: T
    version: string // "4.4.28" など
}
const parsePropertiesResponse = (response: string) => {
    type ResponseJson = toUnknownJson<KnownResponse<KnownProfile>>;
    const jsonRaw: ResponseJson = JSON.parse(response)
    const json = asObjectOrNull(jsonRaw) ?? error`Unexpected response`
    const version = asStringOrNull(json?.version) ?? error`Unexpected response`
    const result = asObjectOrNull(json?.result) ?? error`Unexpected response`
    const email = asStringOrNull(result.socialProfile?.email) ?? error`Unexpected response`
    const performance = asStringOrNull(result.performance) ?? error`Unexpected response`
    const rewardProgress = asNumberOrNull(result.rewardProgress) ?? error`Unexpected response`
    return { email, data: { version, performance, rewardProgress } }
}

type LifeLogData = {
    version: string
    performance: string
    rewardProgress: number
}
type LifeLogPage = {
    /** 期間の始め */
    utc1: string
    /** 期間の終わり */
    utc2: string
    data: LifeLogData
}
type LifeLog = LifeLogPage[]
type LifeLogs = { [email: string]: LifeLog }

const lifelogStorageKey = "WAYFARER_LIFELOG_";
const appendLifeLogPage = async (email: string, data: LifeLogData) => {

    // ローカルストレージから取得
    const lifeLogs: LifeLogs = JSON.parse(localStorage.getItem(lifelogStorageKey) || JSON.stringify({}))
    const lifeLog = lifeLogs[email] ??= []

    const now = new Date().toUTCString()
    const newPage = {
        utc1: now,
        utc2: now,
        data: data,
    }

    // 最後のページと新しいページが同じ内容なら、最後のページの日付を更新する
    const lastPath = lifeLog[lifeLog.length]
    if (lastPath != null && JSON.stringify(lastPath.data) === JSON.stringify(newPage.data)) {
        lastPath.utc2 = newPage.utc2
    }
    // 最後のページと新しいページが同じ内容でないなら、新しいページを最後に挿入する
    else {
        lifeLog.push(newPage)
    }

    // ローカルストレージに保存
    localStorage.setItem(lifelogStorageKey, JSON.stringify(lifeLogs))
}

// プロパティを要求したとき
const onGetProperties = async function(this: XMLHttpRequest) {

    // 応答を取得
    const { email, data } = parsePropertiesResponse(this.response)

    // 追記
    await appendLifeLogPage(email, data)

    // グラフの親要素の表示を待つ
    await waitElement("wf-header")

    // TODO: グラフを組み立てる
}

const handleAsyncError = <TThis>(asyncAction: (this: TThis) => Promise<void>): (this: TThis) => void => function () {
    asyncAction.call(this).catch((error: unknown) => {
        console.error(error)
    })
}

injectXHRGet('/api/v1/vault/properties', handleAsyncError(onGetProperties))
