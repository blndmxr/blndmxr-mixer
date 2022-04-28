import * as blnd from "blindmixer-lib";
import globals from "../config/globals.json";

declare module "*.svg" {
	const content: string;
	export default content;
}

declare global {
	const GLOBALS: typeof globals;

	type HistoryPushProp = { history: { push: (path: string) => void } };

	type LightningProps = {
		paymentRequest: string;
		created: Date;
		claimableHash: string;
		claimable:
			| (blnd.LightningPayment & Partial<blnd.Acknowledged.Claimable>)
			| (blnd.LightningInvoice & Partial<blnd.Acknowledged.Claimable>); // reversed typing
	};
}
