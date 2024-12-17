import { listLambdas } from "./lambda/index.js";
import { getLogEvents } from "./cloudwatch/index.js";
import { FunctionConfiguration } from "@aws-sdk/client-lambda";
import pLimit from "p-limit";
import { writeFile, appendFile } from "fs/promises";
import cliProgress from "cli-progress";

const CONCURRENCY_LIMIT = 20;
const limit = pLimit(CONCURRENCY_LIMIT);

const regionList: string[] = [
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "eu-central-1",
    "eu-west-1",
];

// Initialize output JSON file
async function initializeFile(filePath: string) {
    await writeFile(filePath, "[\n", "utf-8");
}

// Append data to JSON file
async function appendToFile(filePath: string, data: any, isLast: boolean) {
    const content = JSON.stringify(data) + (isLast ? "\n" : ",\n");
    await appendFile(filePath, content, "utf-8");
}

// Finalize output JSON file
async function finalizeFile(filePath: string) {
    await appendFile(filePath, "]", "utf-8");
}

async function main() {
    const allLambdasFilePath = "./lambdaInfo.json";
	const problemLambdasFilePath = "./problemLambdas.json";
    await initializeFile(allLambdasFilePath);
	await initializeFile(problemLambdasFilePath);

    const promiseList: Promise<FunctionConfiguration[]>[] = [];
    for (const region of regionList) {
        promiseList.push(listLambdas(region));
    }

    const results: FunctionConfiguration[][] = await Promise.all(promiseList);

    const lambdaInfo: {
        region: string;
        lambda: string;
		maxMemoryUsedCount: number;
		messageCount: number;
		percentMaxMemoryUsed: number;
    }[] = [];

    const totalLambdas = results.reduce((acc, curr) => acc + curr.length, 0);
    let completedCount = 0;

    // Initialize CLI progress bar
    const progressBar = new cliProgress.SingleBar({
        format: 'Progress [{bar}] {percentage}% | Completed: {value}/{total} Lambdas',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.shades_classic);

    progressBar.start(totalLambdas, 0);

    // Process Lambdas
    const processingPromises: Promise<void>[] = [];

    for (const regionIdx in results) {
        for (const lambda of results[regionIdx]) {
            const processingPromise = limit(async () => {
                try {
                    let stats = await getLogEvents(regionList[regionIdx], `/aws/lambda/${lambda.FunctionName}`);
					if (!stats) {
						stats = [0, 0];
					}
                    const info = {
                        region: regionList[regionIdx],
                        lambda: lambda.FunctionName!,
                        maxMemoryUsedCount: stats[0],
						messageCount: stats[1],
						percentMaxMemoryUsed: stats[1] === 0 ? 0 : (stats[0] / stats[1]) * 100
                    };

                    lambdaInfo.push(info);
                    completedCount++;

                    // Append each resolved item to the JSON file
                    const isLast = completedCount === totalLambdas;
					if (stats[1] !== 0) {
                    	await appendToFile(allLambdasFilePath, info, isLast);
						if (info.percentMaxMemoryUsed > 50)  {
							await appendToFile(problemLambdasFilePath, info, isLast);
						}
					}

                    // Update the progress bar
                    progressBar.update(completedCount);
                } catch (err) {
                    console.error(`Error processing ${lambda.FunctionName}:`, err);
                }
            });

            processingPromises.push(processingPromise);
        }
    }

    await Promise.all(processingPromises);
    await finalizeFile(allLambdasFilePath);
	await finalizeFile(problemLambdasFilePath);

    // Stop the progress bar
    progressBar.stop();

    console.log("All Lambda information has been processed and written to the file.");
}

main().catch((err) => console.error("Error in main function:", err));
