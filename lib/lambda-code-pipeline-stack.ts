import * as cdk from "aws-cdk-lib";
import {
  aws_codebuild,
  aws_codepipeline,
  aws_codepipeline_actions,
  aws_iam,
  aws_s3,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { ARTIFACT_BUCKET_NAME } from "./artifact-bucket-stack";
import { IBucket } from "aws-cdk-lib/aws-s3";

const STACK_NAME = "HtmlToPdfLambdaStack";

export class LambdaCodePipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const artifactBucket = aws_s3.Bucket.fromBucketName(
      this,
      "LambdaCodePipelineArtifactBucket",
      ARTIFACT_BUCKET_NAME
    );

    const codePipeline = this.createCodePipeline(artifactBucket);

    const project = this.createCodeBuild();

    const sourceOutput = new aws_codepipeline.Artifact();
    const buildOutput = new aws_codepipeline.Artifact();
    const secret = this.node.tryGetContext("SECRET_ID") as string;

    codePipeline.addStage({
      stageName: "Source",
      actions: [
        new aws_codepipeline_actions.GitHubSourceAction({
          actionName: "Source",
          owner: "Tomoaki-Moriya",
          repo: "html-to-pdf-lambda",
          branch: "main",
          oauthToken: cdk.SecretValue.secretsManager(secret, {
            jsonField: "GITHUB_OAUTH_TOKEN",
          }),
          output: sourceOutput,
          runOrder: 1,
        }),
      ],
    });

    codePipeline.addStage({
      stageName: "Build",
      actions: [
        new aws_codepipeline_actions.CodeBuildAction({
          actionName: "Build",
          project,
          input: sourceOutput,
          outputs: [buildOutput],
          runOrder: 2,
        }),
      ],
    });

    codePipeline.addStage({
      stageName: "Deploy",
      actions: [
        new aws_codepipeline_actions.CloudFormationCreateReplaceChangeSetAction(
          {
            actionName: "CreateChangeSet",
            stackName: STACK_NAME,
            changeSetName: `${STACK_NAME}ChangeSet`,
            runOrder: 3,
            templatePath: buildOutput.atPath("build.yaml"),
            templateConfiguration: buildOutput.atPath("param.json"),
            adminPermissions: true,
          }
        ),
        new aws_codepipeline_actions.CloudFormationExecuteChangeSetAction({
          actionName: "ExecuteChangeSet",
          stackName: STACK_NAME,
          changeSetName: `${STACK_NAME}ChangeSet`,
          runOrder: 4,
        }),
      ],
    });
  }

  private createCodeBuild() {
    const codeBuildRole = new aws_iam.Role(
      this,
      "LambdaCodePipelineCodeBuildRoleId",
      {
        assumedBy: new aws_iam.ServicePrincipal("codebuild.amazonaws.com"),
        inlinePolicies: {
          CodeBuildRolePolicy: new aws_iam.PolicyDocument({
            statements: [
              new aws_iam.PolicyStatement({
                actions: [
                  "ecr:DescribeRepositories",
                  "ecr:GetAuthorizationToken",
                  "ecr:BatchCheckLayerAvailability",
                  "ecr:GetDownloadUrlForLayer",
                  "ecr:GetRepositoryPolicy",
                  "ecr:ListImages",
                  "ecr:BatchGetImage",
                  "ecr:InitiateLayerUpload",
                  "ecr:UploadLayerPart",
                  "ecr:CompleteLayerUpload",
                  "ecr:PutImage",
                ],
                resources: ["*"],
              }),
            ],
          }),
        },
      }
    );

    return new aws_codebuild.PipelineProject(this, "Project", {
      projectName: "LambdaProject",
      environment: {
        privileged: true,
        buildImage: aws_codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
      },
      environmentVariables: {
        AWS_ACCOUNT_ID: {
          value: this.account,
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
        ARTIFACT_S3_BUCKET_NAME: {
          value: ARTIFACT_BUCKET_NAME,
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
      },
      role: codeBuildRole,
    });
  }

  private createCodePipeline(artifactBucket: IBucket) {
    const codePipelineRole = new aws_iam.Role(
      this,
      "LambdaCodePipelineRoleId",
      {
        assumedBy: new aws_iam.ServicePrincipal("codepipeline.amazonaws.com"),
        inlinePolicies: {
          LambdaCodePipelinePolicy: new aws_iam.PolicyDocument({
            statements: [
              new aws_iam.PolicyStatement({
                actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"],
                resources: [
                  `arn:aws:s3:::${ARTIFACT_BUCKET_NAME}/*`,
                  `arn:aws:s3:::${ARTIFACT_BUCKET_NAME}`,
                ],
                effect: aws_iam.Effect.ALLOW,
              }),
              new aws_iam.PolicyStatement({
                effect: aws_iam.Effect.ALLOW,
                actions: [
                  "iam:GetRole",
                  "iam:CreateRole",
                  "iam:TagRole",
                  "iam:AttachRolePolicy",
                  "iam:PassRole",
                ],
                resources: ["*"],
              }),
              new aws_iam.PolicyStatement({
                effect: aws_iam.Effect.ALLOW,
                actions: [
                  "lambda:GetFunction",
                  "lambda:GetFunctionUrlConfig",
                  "lambda:CreateFunction",
                  "lambda:CreateFunctionUrlConfig",
                  "lambda:AddPermission",
                  "lambda:TagResource",
                ],
                resources: ["*"],
              }),
            ],
          }),
        },
      }
    );

    return new aws_codepipeline.Pipeline(this, "LambdaCodePipelineId", {
      pipelineName: "LambdaCodePipeline",
      role: codePipelineRole,
      artifactBucket,
    });
  }
}
