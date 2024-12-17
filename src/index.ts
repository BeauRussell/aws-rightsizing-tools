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

	Promise.all(promiseList).then((results: FunctionConfiguration[][]) => {
		for (const regionIdx in results) {
			for (const lambda of results[regionIdx]) {
				getLogEvents(regionList[regionIdx], `/aws/lambda/${lambda.FunctionName}`);
			}
		}
	});
};

main();
