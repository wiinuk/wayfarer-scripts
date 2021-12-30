import Chart from "chart.js/auto";
import { range } from "./array-extensions";
import Resources from "../resources.json";
import * as D from "./date-time";
import { DateTime } from "./date-time";
const { Messages } = Resources;

const DayOfWeeks = [
    Messages.Sunday,
    Messages.Monday,
    Messages.Tuesday,
    Messages.Wednesday,
    Messages.Thursday,
    Messages.Friday,
    Messages.Saturday,
] as const;

export type DaySummary = {
    finished: number;
    agreement: number;
};
export const appendChartElement = (parent: HTMLCanvasElement) => {
    const getDayOfWeekName = (current: DateTime, days: number) =>
        DayOfWeeks[D.getDayOfWeek(D.addDays(current, -days))];

    const days = 7;
    const randomData = () =>
        range(days).reduce<readonly [number, number[]]>(
            ([n, xs]) => [n + Math.random() * 10, xs.concat(n)],
            [Math.random() * 100, []]
        )[1];

    const finishedAxisId = "finished";
    const agreementAxisId = "agreement";

    const now = D.now();
    const finishedDataset = {
        label: Messages.Finished,
        data: randomData(),
        yAxisID: finishedAxisId,
    };
    const agreementDataset = {
        label: Messages.Agreement,
        data: randomData(),
        yAxisID: agreementAxisId,
    };
    const chart = new Chart(parent, {
        type: "line",
        data: {
            labels: range(days).map((_, i, xs) =>
                getDayOfWeekName(now, xs.length - 1 - i)
            ),
            datasets: [finishedDataset, agreementDataset],
        },
        options: {
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                [finishedAxisId]: {
                    type: "linear",
                    position: "left",
                },
                [agreementAxisId]: {
                    type: "linear",
                    position: "right",
                },
            },
        },
    });
    const setData = (
        currentDate: DateTime,
        values: readonly Readonly<DaySummary>[]
    ) => {
        chart.data.labels = range(values.length).map((_, i, xs) =>
            getDayOfWeekName(currentDate, xs.length - 1 - i)
        );
        finishedDataset.data = values.map(({ finished }) => finished);
        agreementDataset.data = values.map(({ agreement }) => agreement);
        chart.update();
    };
    return { setData };
};
