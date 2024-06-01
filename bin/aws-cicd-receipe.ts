#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LambdaCodePipelineStack } from "../lib/lambda-code-pipeline-stack";
import { ArtifactBucketStack } from "../lib/artifact-bucket-stack";
import { SecretsManagerStack } from "../lib/secrets-manager-stack";

const app = new cdk.App();
[
  { StackInstance: LambdaCodePipelineStack, name: "LambdaCodePipelineStack" },
  { StackInstance: ArtifactBucketStack, name: "ArtifactBucketStack" },
  { StackInstance: SecretsManagerStack, name: "SecretsManagerStack" },
].forEach(({ StackInstance, name }) => {
  new StackInstance(app, name);
});
