import { CloudWatchLogsClient, GetLogEventsCommand, DescribeLogStreamsCommand, DescribeLogStreamsCommandOutput, LogStream, GetLogEventsCommandOutput } from "@aws-sdk/client-cloudwatch-logs";

async function getLogEvents(region: string, logGroup: string) {
	const client = new CloudWatchLogsClient({ region: region });
	let nextToken: string | undefined = undefined;
		do {
		const getStreamCommand = new DescribeLogStreamsCommand({ logGroupName: logGroup, nextToken });
		let getStreamsResponse: DescribeLogStreamsCommandOutput;
		let logStreamNames: string[] = [];
		try {
			getStreamsResponse = await client.send(getStreamCommand);
			if (getStreamsResponse.logStreams) {
				logStreamNames.push(...getStreamsResponse.logStreams.map((stream: LogStream) => stream.logStreamName) as string[]);
			}
		} catch (err) {
			throw new Error(`Failed to get log streams from log group ${logGroup}, error: ${err}`);
		}

		if (logStreamNames.length === 0) {
			throw new Error(`No log streams found in log group ${logGroup}`);
		}

		const stream: LogStream = getStreamsResponse.logStreams![0];
		const getEventsCommand = new GetLogEventsCommand({ logGroupName: logGroup, logStreamName: stream.logStreamName });
		const getEventsResponse: GetLogEventsCommandOutput = await client.send(getEventsCommand);

		console.log(getEventsResponse.event[0]);

	} while (nextToken);
}

export { getLogEvents };
