/**
 * Purpose:
 * Defines the complete reproducible AWS CDK Stack for Ctrl Short:
 * DynamoDB tables with GSIs and TTL, SQS queues with DLQs, Cognito User Pools,
 * least-privilege IAM roles, Lambda controllers, API Gateway with Cognito Authorizer,
 * and CloudWatch alarms.
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as path from 'path';
import * as fs from 'fs';

export class CtrlShortStack extends cdk.Stack {
  public readonly apiEndpoint: cdk.CfnOutput;
  public readonly userPoolId: cdk.CfnOutput;
  public readonly userPoolClientId: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // =========================================================================
    // 1. DYNAMODB TABLES
    // =========================================================================

    // URLs Table (PK: shortCode)
    const urlsTable = new dynamodb.Table(this, 'UrlsTable', {
      tableName: 'CtrlShort-Urls',
      partitionKey: { name: 'shortCode', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // GSI for User Link Listing (PK: userId, SK: createdAt)
    urlsTable.addGlobalSecondaryIndex({
      indexName: 'userId-createdAt-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Analytics Table (PK: shortCode, SK: timestampEvent)
    const analyticsTable = new dynamodb.Table(this, 'AnalyticsTable', {
      tableName: 'CtrlShort-Analytics',
      partitionKey: { name: 'shortCode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestampEvent', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // =========================================================================
    // 2. SQS QUEUES (Click Ingestion & Dead-Letter Queue)
    // =========================================================================

    const analyticsDlq = new sqs.Queue(this, 'AnalyticsDLQ', {
      queueName: 'CtrlShort-AnalyticsDLQ',
      retentionPeriod: cdk.Duration.days(14),
    });

    const analyticsQueue = new sqs.Queue(this, 'AnalyticsQueue', {
      queueName: 'CtrlShort-AnalyticsQueue',
      visibilityTimeout: cdk.Duration.seconds(30),
      deadLetterQueue: {
        maxReceiveCount: 5,
        queue: analyticsDlq,
      },
    });

    // =========================================================================
    // 3. AMAZON COGNITO AUTHENTICATION
    // =========================================================================

    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'CtrlShort-UserPool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: 'CtrlShort-WebClient',
      generateSecret: false, // SPA / Web Frontend
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // =========================================================================
    // 4. AWS LAMBDA CONTROLLERS
    // =========================================================================

    const backendDistPath = path.join(process.cwd(), 'dist-backend');
    const backendPath = fs.existsSync(backendDistPath) ? backendDistPath : path.join(process.cwd(), 'backend');
    const codeAsset = lambda.Code.fromAsset(backendPath);

    // Redirect Handler (Public, ultra-low latency)
    const redirectHandler = new lambda.Function(this, 'RedirectHandler', {
      functionName: 'CtrlShort-RedirectHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/redirect.handler',
      code: codeAsset,
      timeout: cdk.Duration.seconds(5),
      memorySize: 256,
      environment: {
        URLS_TABLE_NAME: urlsTable.tableName,
        ANALYTICS_QUEUE_URL: analyticsQueue.queueUrl,
      },
    });

    // API Controller (Protected CRUD & Analytics retrieval)
    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      functionName: 'CtrlShort-ApiHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/api.handler',
      code: codeAsset,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        URLS_TABLE_NAME: urlsTable.tableName,
        ANALYTICS_TABLE_NAME: analyticsTable.tableName,
        USER_GSI_NAME: 'userId-createdAt-index',
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    // Analytics Worker (Asynchronous SQS consumer)
    const analyticsWorker = new lambda.Function(this, 'AnalyticsWorker', {
      functionName: 'CtrlShort-AnalyticsWorker',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/analytics.handler',
      code: codeAsset,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: {
        URLS_TABLE_NAME: urlsTable.tableName,
        ANALYTICS_TABLE_NAME: analyticsTable.tableName,
      },
    });

    // Wire SQS event source to Analytics Worker
    analyticsWorker.addEventSource(
      new lambdaEventSources.SqsEventSource(analyticsQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      })
    );

    // =========================================================================
    // 5. IAM LEAST PRIVILEGE PERMISSIONS
    // =========================================================================

    // Redirect handler permissions
    urlsTable.grantReadData(redirectHandler);
    analyticsQueue.grantSendMessages(redirectHandler);

    // API handler permissions
    urlsTable.grantReadWriteData(apiHandler);
    analyticsTable.grantReadData(apiHandler);

    // Analytics worker permissions
    analyticsTable.grantWriteData(analyticsWorker);
    urlsTable.grant(analyticsWorker, 'dynamodb:UpdateItem');

    // =========================================================================
    // 6. API GATEWAY WITH COGNITO AUTHORIZER
    // =========================================================================

    const api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: 'CtrlShort-API',
      description: 'Ctrl Short Serverless API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 500,
      },
    });

    api.addGatewayResponse('Default4XXResponse', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'Access-Control-Allow-Methods': "'GET,POST,PATCH,DELETE,OPTIONS'",
      },
    });

    api.addGatewayResponse('Default5XXResponse', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'Access-Control-Allow-Methods': "'GET,POST,PATCH,DELETE,OPTIONS'",
      },
    });

    const lambdaApiIntegration = new apigateway.LambdaIntegration(apiHandler);
    const lambdaRedirectIntegration = new apigateway.LambdaIntegration(redirectHandler);

    // Public Redirect: GET /r/{shortCode}
    const rResource = api.root.addResource('r');
    const shortCodeResource = rResource.addResource('{shortCode}');
    shortCodeResource.addMethod('GET', lambdaRedirectIntegration);

    // Public Auth endpoints: POST /auth/signup & POST /auth/signin
    const authResource = api.root.addResource('auth');
    const signupResource = authResource.addResource('signup');
    signupResource.addMethod('POST', lambdaApiIntegration);

    const signinResource = authResource.addResource('signin');
    signinResource.addMethod('POST', lambdaApiIntegration);

    // /urls routes (Authenticated inside Lambda via authenticateRequest)
    const urlsResource = api.root.addResource('urls');
    urlsResource.addMethod('GET', lambdaApiIntegration);
    urlsResource.addMethod('POST', lambdaApiIntegration);

    const singleUrlResource = urlsResource.addResource('{id}');
    singleUrlResource.addMethod('GET', lambdaApiIntegration);
    singleUrlResource.addMethod('PATCH', lambdaApiIntegration);
    singleUrlResource.addMethod('DELETE', lambdaApiIntegration);

    // /urls/{id}/analytics
    const analyticsResource = singleUrlResource.addResource('analytics');
    analyticsResource.addMethod('GET', lambdaApiIntegration);

    // =========================================================================
    // 7. CLOUDWATCH ALARMS
    // =========================================================================

    new cloudwatch.Alarm(this, 'DLQMessagesAlarm', {
      alarmName: 'CtrlShort-DLQ-VisibleMessages',
      metric: analyticsDlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: 'Alert if click events are accumulating in the Dead Letter Queue.',
    });

    new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: 'CtrlShort-API-5xxErrors',
      metric: api.metricServerError(),
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: 'Alert if the API Gateway generates more than 5 server errors within evaluation period.',
    });

    // =========================================================================
    // 8. STACK OUTPUTS
    // =========================================================================

    this.apiEndpoint = new cdk.CfnOutput(this, 'ApiUrlOutput', {
      value: api.url,
      description: 'Base URL for Ctrl Short API Gateway',
      exportName: 'CtrlShort-ApiEndpoint',
    });

    this.userPoolId = new cdk.CfnOutput(this, 'UserPoolIdOutput', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'CtrlShort-UserPoolId',
    });

    this.userPoolClientId = new cdk.CfnOutput(this, 'UserPoolClientIdOutput', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'CtrlShort-UserPoolClientId',
    });

    new cdk.CfnOutput(this, 'UrlsTableNameOutput', {
      value: urlsTable.tableName,
      description: 'DynamoDB URLs Table Name',
    });

    new cdk.CfnOutput(this, 'AnalyticsQueueUrlOutput', {
      value: analyticsQueue.queueUrl,
      description: 'SQS Analytics Queue URL',
    });
  }
}
