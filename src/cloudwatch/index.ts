import { CloudWatchLogsClient, GetQueryResultsCommandInput, GetQueryResultsCommand, GetQueryResultsCommandOutput, StartQueryCommandInput, StartQueryCommand, StartQueryCommandOutput, ResourceNotFoundException, ResultField } from "@aws-sdk/client-cloudwatch-logs";
import { strict as assert } from "node:assert";

async function getLogEvents(region: string, logGroup: string | undefined): Promise<void> {
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
			console.log(logGroup);
			setTimeout(async () => {
				await processQuery(queryId, client);
			}, 60000);
		}
	} catch (err) {
		if (err instanceof ResourceNotFoundException) {
			return;
		} else {
			console.error(err);
		}
	}
}

async function processQuery(queryId: string, client: CloudWatchLogsClient): Promise<void> {
	let results: GetQueryResultsCommandOutput;
	const resultsParams: GetQueryResultsCommandInput = {
		queryId: queryId,
	};
	results = await client.send(new GetQueryResultsCommand(resultsParams));
	if (results.results && results.results!.length > 0) {
		processMessages(results.results);
	}
}

function processMessages(results: ResultField[][]): void {
	let maxMemoryUsedCount: number = 0;
	let messageCount: number = 0;
	for (const result of results) {
		for (const field of result) {
			if (field.field === "@message") {
				messageCount++;
				if (checkMemoryMaxed(field.value)) {
					maxMemoryUsedCount++;
				}
			}
		}
	}

	console.log(`Messages Processed: ${messageCount}`);
	console.log(`Max Memory Used Messages: ${maxMemoryUsedCount}`);
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
	} else {
		return false;
	}
}

export { getLogEvents };
