import { Context, Contract } from "fabric-contract-api";
import { Store } from "./store";
import { Iterators } from "fabric-shim";
export declare class StoreContract extends Contract {
    storeExists(ctx: Context, storeId: string): Promise<boolean>;
    createStore(ctx: Context, storeId: string, value: string): Promise<Store>;
    readStore(ctx: Context, storeId: string): Promise<Store>;
    updateStore(ctx: Context, storeId: string, newValue: string): Promise<Store>;
    deleteStore(ctx: Context, storeId: string): Promise<boolean>;
    getHistoryForKey(ctx: Context, storeId: string): Promise<Iterators.KeyModification[]>;
}
