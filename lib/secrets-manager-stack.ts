import * as cdk from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export const SECRET_NAME = "AwsCicdRecipe";
export const GITHUB_OAUTH_TOKEN_KEY = "GITHUB_OAUTH_TOKEN";

export class SecretsManagerStack extends cdk.Stack {
  public readonly secret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubAuthToken = this.node.tryGetContext(
      "GITHUB_OAUTH_TOKEN"
    ) as string;

    new secretsmanager.Secret(this, `${SECRET_NAME}Id`, {
      secretName: SECRET_NAME,
      secretObjectValue: {
        [GITHUB_OAUTH_TOKEN_KEY]:
          cdk.SecretValue.unsafePlainText(githubAuthToken),
      },
    });
  }
}
