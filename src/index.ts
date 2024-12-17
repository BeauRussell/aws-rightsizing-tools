import { listLambdas } from "./lambda/index.js";
import { getLogEvents } from "./cloudwatch/index.js";
import { FunctionConfiguration } from "@aws-sdk/client-lambda";

const regionList: string[] = [
	"us-east-1",
	"us-east-2",
	"us-west-1",
	"us-west-2",
	"eu-central-1",
	"eu-west-1",
];

function main() {
	const promiseList: Promise<FunctionConfiguration[]>[] = [];
	for (const region of regionList) {
		promiseList.push(listLambdas(region));
	}

	Promise.all(promiseList).then(async (results: FunctionConfiguration[][]) => {
		const lambdaInfo: { 
			region: string;
			lambda: string;
			runInfo: Promise<[number, number] | undefined>;
		}[] =[];
		for (const regionIdx in results) {
			for (const lambda of results[regionIdx]) {
				const queryInfo: Promise<[number, number]| undefined> = getLogEvents(regionList[regionIdx], `/aws/lambda/${lambda.FunctionName}`);
				lambdaInfo.push({
					region: regionList[regionIdx],
					lambda: lambda.FunctionName!,
					runInfo: queryInfo,
				});
			}
		}
		console.log(lambdaInfo);
		console.log(await lambdaInfo[0].runInfo);
	});
};

main();
