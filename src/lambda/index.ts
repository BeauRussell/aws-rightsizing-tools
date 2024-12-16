import { ListFunctionsCommand, LambdaClient, ListFunctionsCommandOutput, FunctionConfiguration } from "@aws-sdk/client-lambda";
import { strict as assert } from "node:assert";

async function listLambdas(region: string): Promise<FunctionConfiguration[]>{
	assert(region, "Region is required");
	const client = new LambdaClient({ region });
	const lambdas: FunctionConfiguration[] = [];

	let nextToken: string | undefined = undefined;
	do {
		try {
			// ListFunctionsCommand only gets 50 at a time. Need to paginate through it.
			const command = new ListFunctionsCommand({ Marker: nextToken });
			const response: ListFunctionsCommandOutput = await client.send(command);

			if (response.Functions) {
				lambdas.push(...response.Functions);
			}

			nextToken = response.NextMarker;
		} catch (err) {
			console.error("Error listing lambda functions", err);
			throw err
		}
	} while (nextToken);

	return lambdas;
}

export { listLambdas };
