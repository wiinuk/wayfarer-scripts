import { lazy } from "./lazy";
import { sleep } from "./standard-extensions";

it("重複実行しない", async () => {
    let callCount = 0;
    const x = lazy(async () => {
        callCount++;
        await sleep(1000);
    });
    await x();
    await x();
    expect(callCount).toBe(1);
});
