import { listLambdas } from "./lambda/index.js";

listLambdas("us-east-2").then((lambdas) => {
	console.log(lambdas);
});
