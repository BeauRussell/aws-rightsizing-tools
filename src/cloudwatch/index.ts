import { CloudWatchLogsClient, GetQueryResultsCommandInput, GetQueryResultsCommand, GetQueryResultsCommandOutput, StartQueryCommandInput, StartQueryCommand, StartQueryCommandOutput, ResourceNotFoundException, ResultField } from "@aws-sdk/client-cloudwatch-logs";
import { strict as assert } from "node:assert";

async function getLogEvents(region: string, logGroup: string | undefined): Promise<[number, number] | undefined> {
	assert(region, 'region is required');
	assert(logGroup, 'logGroup is required');
	const client = new CloudWatchLogsClient({ region: region });
	
	const query: string = "filter @message LIKE /Max Memory Used:/";
	const params: StartQueryCommandInput = {
		logGroupName: logGroup,
		queryString: query,
		endTime: new Date().getTime(),
		startTime: new Date().getTime() - 1000 * 60 * 60 * 24 * 30,
		limit: 1000,
	};

	let response: StartQueryCommandOutput;
	try {
		const command = new StartQueryCommand(params);
		response = await client.send(command);
		
		const queryId: string | undefined = response.queryId;

		if (queryId) {
			return new Promise<[number, number]>((resolve, reject) => {
				try {
					setTimeout(async () => {
						const stats: [number, number] = await processQuery(queryId, client);
						resolve(stats);
					}, 60000);
				} catch (err) {
					reject(err);
				}
			});
		}
	} catch (err) {
		if (err instanceof ResourceNotFoundException) {
			return;
		} else {
			console.error(err);
		}
	}
}

async function processQuery(queryId: string, client: CloudWatchLogsClient): Promise<[number, number]> {
	let results: GetQueryResultsCommandOutput;
	let stats: [number, number] = [0, 0];
	const resultsParams: GetQueryResultsCommandInput = {
		queryId: queryId,
	};
	try {
		results = await client.send(new GetQueryResultsCommand(resultsParams));
		if (results.results && results.results!.length > 0) {
			stats = processMessages(results.results);
		}
	} catch (err) {
		console.error(err);
	}

	return stats;
}

function processMessages(results: ResultField[][]): [number, number] {
	let maxMemoryUsedCount: number = 0;
	let messageCount: number = 0;
	for (const result of results) {
		for (const field of result) {
			if (field.field === "@message") {
				messageCount++;
				if (checkMemoryMaxed(field.value!)) {
					maxMemoryUsedCount++;
				}
			}
		}
	}

	return [maxMemoryUsedCount, messageCount];
}

function checkMemoryMaxed(message: string): boolean {
	const regex = /Memory Size: ([0-9]*)|Max Memory Used: ([0-9]*)/
	const match = message.match(regex);
	if (match && match.length > 0) {
		const maxMemoryUsed = parseInt(match[2]);
		const memorySize = parseInt(match[1]);
		if (maxMemoryUsed >= memorySize) {
			return true;
		}
	} 
	return false;
}

export { getLogEvents };
