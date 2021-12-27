import Chart from "chart.js/auto";
import Resources from "./resources.json";
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

const range = (count: number) => {
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(i);
    }
    return result;
};
export const newAddDays = (current: Date, days: number) => {
    const result = new Date(current);
    result.setHours(result.getHours() + days * 24);
    return result;
};
export type DayValue = {
    finished: number;
    agreement: number;
};
export const appendChartElement = (parent: HTMLCanvasElement) => {
    const getDayOfWeek = (current: Date, days: number) =>
        DayOfWeeks[
            newAddDays(current, -days).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
        ];

    const days = 7;
    const randomData = () =>
        range(days).reduce<readonly [number, number[]]>(
            ([n, xs]) => [n + Math.random() * 10, xs.concat(n)],
            [Math.random() * 100, []]
        )[1];

    const finishedAxisId = "finished";
    const agreementAxisId = "agreement";

    const now = new Date();
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
                getDayOfWeek(now, xs.length - 1 - i)
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
        currentDate: Date,
        values: readonly Readonly<DayValue>[]
    ) => {
        chart.data.labels = range(values.length).map((_, i, xs) =>
            getDayOfWeek(currentDate, xs.length - 1 - i)
        );
        finishedDataset.data = values.map(({ finished }) => finished);
        agreementDataset.data = values.map(({ agreement }) => agreement);
        chart.update();
    };
    return { setData };
};
