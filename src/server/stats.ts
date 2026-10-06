import { store } from "./store";

const key = "stats:queries";

export const countQuery = () => store.bump(key);

export const queryCount = async () => (await store.get<number>(key).catch(() => null)) ?? 0;
