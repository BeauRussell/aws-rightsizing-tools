import { CloudWatchLogsClient, GetQueryResultsCommandInput, GetQueryResultsCommand, GetQueryResultsCommandOutput, StartQueryCommandInput, StartQueryCommand, StartQueryCommandOutput, ResourceNotFoundException } from "@aws-sdk/client-cloudwatch-logs";
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
			setTimeout(async () => {
				let results: GetQueryResultsCommandOutput;
				const resultsParams: GetQueryResultsCommandInput = {
					queryId: queryId,
				};
				results  = await client.send(new GetQueryResultsCommand(resultsParams));
				if (results.results && results.results!.length > 0) {
					console.log(results.results);
					console.log(results.results[0]);
					console.log(results.results[0][0]);
					console.log(results.results[0][0].value);
					console.log(results.results[0][0].field);
				}
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

export { getLogEvents };
