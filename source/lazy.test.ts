import { lazy } from "./lazy";
import { sleep } from "./standard-extensions";

it("重複実行しない", async () => {
    let log = "";
    const x = lazy(async () => {
        log += "a";
        await sleep(100);
        log += "b";
    });
    await x();
    await x();
    expect(log).toBe("ab");
});
