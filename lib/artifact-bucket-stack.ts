import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export const ARTIFACT_BUCKET_NAME = "aws-ci-cd-recipe-artifact-bucket";

export class ArtifactBucketStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new Bucket(this, `${ARTIFACT_BUCKET_NAME}-id`, {
      removalPolicy: RemovalPolicy.DESTROY,
      bucketName: ARTIFACT_BUCKET_NAME,
    });
  }
}
