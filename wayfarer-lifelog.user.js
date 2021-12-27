
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

/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./wayfarer-lifelog.ts
var __makeTemplateObject = (undefined && undefined.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var injectXHRGet = function (_a, targetUrl, onGet) {
    var XMLHttpRequest = _a.XMLHttpRequest;
    var originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        if (url === targetUrl && method === "GET") {
            this.addEventListener("load", onGet, false);
        }
        // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-explicit-any
        originalOpen.apply(this, arguments);
    };
};
var sleep = function (milliseconds) {
    return new Promise(function (resolve) { return setTimeout(resolve, milliseconds); });
};
var waitElement = function (selectors, retryCount, intervalMilliseconds) {
    if (retryCount === void 0) { retryCount = 10; }
    if (intervalMilliseconds === void 0) { intervalMilliseconds = 1000; }
    return __awaiter(void 0, void 0, void 0, function () {
        var i, element;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    retryCount = Math.trunc(Math.max(0, retryCount));
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < retryCount)) return [3 /*break*/, 4];
                    element = document.querySelector(selectors);
                    if (element) {
                        return [2 /*return*/, element];
                    }
                    return [4 /*yield*/, sleep(intervalMilliseconds)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: throw new Error("Element not found");
            }
        });
    });
};
var error = function (template) {
    var substitutions = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        substitutions[_i - 1] = arguments[_i];
    }
    throw new Error(String.raw.apply(String, __spreadArray([template], substitutions, false)));
};
var asObjectOrNull = function (jsonOrUndefined) {
    return (typeof jsonOrUndefined === "object" && jsonOrUndefined !== null
        ? jsonOrUndefined
        : null);
};
var asStringOrNull = function (x) { return (typeof x === "string" ? x : null); };
var asNumberOrNull = function (x) { return (typeof x === "number" ? x : null); };
var parsePropertiesResponse = function (response) {
    var _a, _b, _c, _d, _e, _f, _g;
    var jsonRaw = JSON.parse(response);
    var json = (_a = asObjectOrNull(jsonRaw)) !== null && _a !== void 0 ? _a : error(templateObject_1 || (templateObject_1 = __makeTemplateObject(["Unexpected response"], ["Unexpected response"])));
    var version = (_b = asStringOrNull(json === null || json === void 0 ? void 0 : json.version)) !== null && _b !== void 0 ? _b : error(templateObject_2 || (templateObject_2 = __makeTemplateObject(["Unexpected response"], ["Unexpected response"])));
    var result = (_c = asObjectOrNull(json === null || json === void 0 ? void 0 : json.result)) !== null && _c !== void 0 ? _c : error(templateObject_3 || (templateObject_3 = __makeTemplateObject(["Unexpected response"], ["Unexpected response"])));
    var email = (_e = asStringOrNull((_d = result.socialProfile) === null || _d === void 0 ? void 0 : _d.email)) !== null && _e !== void 0 ? _e : error(templateObject_4 || (templateObject_4 = __makeTemplateObject(["Unexpected response"], ["Unexpected response"])));
    var performance = (_f = asStringOrNull(result.performance)) !== null && _f !== void 0 ? _f : error(templateObject_5 || (templateObject_5 = __makeTemplateObject(["Unexpected response"], ["Unexpected response"])));
    var rewardProgress = (_g = asNumberOrNull(result.rewardProgress)) !== null && _g !== void 0 ? _g : error(templateObject_6 || (templateObject_6 = __makeTemplateObject(["Unexpected response"], ["Unexpected response"])));
    return { email: email, data: { version: version, performance: performance, rewardProgress: rewardProgress } };
};
var lifelogStorageKey = "WAYFARER_LIFELOG_";
var appendLifeLogPageTo = function (lifeLogs, email, data) { return __awaiter(void 0, void 0, void 0, function () {
    var lifeLog, now, newPage, lastPage;
    var _a;
    return __generator(this, function (_b) {
        lifeLog = ((_a = lifeLogs[email]) !== null && _a !== void 0 ? _a : (lifeLogs[email] = []));
        now = new Date().toISOString();
        newPage = {
            utc1: now,
            utc2: now,
            data: data,
        };
        lastPage = lifeLog[lifeLog.length - 1];
        if (lastPage != null &&
            JSON.stringify(lastPage.data) === JSON.stringify(newPage.data)) {
            lastPage.utc2 = newPage.utc2;
        }
        // 最後のページと新しいページが同じ内容でないなら、新しいページを最後に挿入する
        else {
            lifeLog.push(newPage);
        }
        return [2 /*return*/];
    });
}); };
var appendLifeLogPage = function (email, data) { return __awaiter(void 0, void 0, void 0, function () {
    var lifeLogs;
    return __generator(this, function (_a) {
        lifeLogs = JSON.parse(localStorage.getItem(lifelogStorageKey) || JSON.stringify({}));
        appendLifeLogPageTo(lifeLogs, email, data);
        localStorage.setItem(lifelogStorageKey, JSON.stringify(lifeLogs));
        return [2 /*return*/];
    });
}); };
var insertedGraphElement = null;
var getInsertedGraphElement = function () { return __awaiter(void 0, void 0, void 0, function () {
    var parentElement, graphElement, style;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (insertedGraphElement != null) {
                    return [2 /*return*/, insertedGraphElement];
                }
                return [4 /*yield*/, waitElement("wf-header > div")];
            case 1:
                parentElement = _a.sent();
                graphElement = document.createElement("div");
                style = graphElement.style;
                style.display = "flex";
                style.flexDirection = "row";
                style.boxSizing = "border-box";
                style.height = "100%";
                style.width = "10em";
                // style.padding = "1em"
                style.border = "solid 1px #ccc";
                style.borderRadius = "0.5em";
                parentElement.insertBefore(graphElement, parentElement.querySelector(":scope > a"));
                return [2 /*return*/, (insertedGraphElement = graphElement)];
        }
    });
}); };
// プロパティを要求したとき
var onGetProperties = function () {
    return __awaiter(this, void 0, void 0, function () {
        var _a, email, data, graphElement;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = parsePropertiesResponse(this.response), email = _a.email, data = _a.data;
                    // 追記
                    return [4 /*yield*/, appendLifeLogPage(email, data)];
                case 1:
                    // 追記
                    _b.sent();
                    return [4 /*yield*/, getInsertedGraphElement()];
                case 2:
                    graphElement = _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
var handleAsyncError = function (asyncAction) {
    return function () {
        asyncAction.call(this).catch(function (error) {
            console.error(error);
        });
    };
};
var main = function (global) {
    injectXHRGet(global, "/api/v1/vault/properties", handleAsyncError(onGetProperties));
};
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6;

;// CONCATENATED MODULE: ./wayfarer-lifelog.user.ts
main(__webpack_require__.g);

/******/ })()
;