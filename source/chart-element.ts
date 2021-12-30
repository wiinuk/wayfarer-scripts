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
};
export const appendChartElement = (parent: HTMLCanvasElement) => {
    const getDayOfWeekName = (current: DateTime, days: number) =>
        DayOfWeeks[D.getDayOfWeek(D.addDays(current, -days))];

    const days = 7;
    const randomData = (): (number | undefined)[] =>
        range(days).reduce<readonly [number, number[]]>(
            ([n, xs]) => [n + Math.random() * 10, xs.concat(n)],
            [Math.random() * 100, []]
        )[1];

    const finishedAxisId = "finished";
    const now = D.newUTC(2000, 0, 1);
    const finishedDataset = {
        label: Messages.Finished,
        data: randomData(),
        yAxisID: finishedAxisId,
    };
    const chart = new Chart(parent, {
        type: "bar",
        data: {
            labels: range(days).map((_, i, xs) =>
                getDayOfWeekName(now, xs.length - 1 - i)
            ),
            datasets: [finishedDataset],
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
        chart.update();
    };
    return { setData };
};
