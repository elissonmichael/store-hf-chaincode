import {
	keyHasData,
	saveKeyState,
	recoverKeyState,
	requireKeyNotExists,
} from "./helpers/utils";
import {
	Context,
	Contract,
	Info,
	Returns,
	Transaction,
} from "fabric-contract-api";
import { Store, StoreSchema } from "./store";
import { Iterators } from "fabric-shim";
import { KeyModification } from "./types";
import {
	HealthcheckDTO,
	buildHealthcheckFromContext,
} from "./helpers/healthcheck";
import { validateData } from "./helpers/validate-data-schema";

@Info({
	title: "StoreContract",
	description: "Simple Storage Contract Chaincode",
})
export class StoreContract extends Contract {
	@Transaction(false)
	@Returns("HealthcheckDTO")
	public async healthcheck(ctx: Context): Promise<HealthcheckDTO> {
		return buildHealthcheckFromContext(ctx);
	}

	@Transaction(false)
	@Returns("boolean")
	public async storeExists(ctx: Context, storeId: string): Promise<boolean> {
		return keyHasData(ctx, storeId);
	}

	@Transaction()
	@Returns("Store")
	public async createStore(
		ctx: Context,
		storeId: string,
		value: string
	): Promise<Store> {
		requireKeyNotExists(ctx, storeId);
		const store = validateData(StoreSchema, {
			value,
		});
		await saveKeyState(ctx, storeId, store);
		return store;
	}

	@Transaction(false)
	@Returns("Store")
	public async readStore(ctx: Context, storeId: string): Promise<Store> {
		const data = await recoverKeyState<Store>(ctx, storeId);
		return data;
	}

	@Transaction()
	@Returns("Store")
	public async updateStore(
		ctx: Context,
		storeId: string,
		newValue: string
	): Promise<Store> {
		let store = await recoverKeyState<Store>(ctx, storeId);
		store.value = newValue;
		store = validateData(StoreSchema, store);
		await saveKeyState(ctx, storeId, store);
		return store;
	}

	@Transaction()
	@Returns("Store")
	public async deleteStore(ctx: Context, storeId: string): Promise<Store> {
		const store = await recoverKeyState<Store>(ctx, storeId);
		await ctx.stub.deleteState(storeId);
		return store;
	}

	@Transaction()
	@Returns("Iterators.KeyModification[]")
	public async getHistoryForKey(
		ctx: Context,
		storeId: string
	): Promise<KeyModification[]> {
		const exists: boolean = await this.storeExists(ctx, storeId);
		if (!exists) {
			throw new Error(`The store ${storeId} does not exist`);
		}
		const historyIterator = await ctx.stub.getHistoryForKey(storeId);
		const events: KeyModification[] = [];
		let current = await historyIterator.next();
		while (!current.done) {
			const { txId, timestamp, isDelete } = current.value;
			events.push({ txId, timestamp, isDelete });
			current = await historyIterator.next();
		}
		return events;
	}

	@Transaction()
	@Returns("Iterators.KeyModification")
	public async getHistoryTransactionForKey(
		ctx: Context,
		storeId: string,
		txId: string
	): Promise<Iterators.KeyModification> {
		const exists: boolean = await this.storeExists(ctx, storeId);
		if (!exists) {
			throw new Error(`The store ${storeId} does not exist`);
		}
		const historyIterator = await ctx.stub.getHistoryForKey(storeId);
		let current = await historyIterator.next();
		while (!current.done) {
			if (current.value.txId === txId) {
				const { isDelete, timestamp, value, txId } = current.value;
				const parsedValue = JSON.parse(Buffer.from(value).toString("utf-8"));
				const response = {
					txId,
					timestamp,
					isDelete,
					value: parsedValue,
				};
				return response;
			}
			current = await historyIterator.next();
		}
		throw new Error(`The store ${storeId} has no given txId history`);
	}
}
