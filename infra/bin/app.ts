/**
 * Purpose:
 * Entry point for AWS CDK deployment synthesizing the CtrlShortStack cloud infrastructure.
 */

import * as cdk from 'aws-cdk-lib';
import { CtrlShortStack } from '../lib/ctrl-short-stack';

const app = new cdk.App();

new CtrlShortStack(app, 'CtrlShortStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Ctrl Short — Serverless URL Shortener & Analytics Platform Infrastructure',
});

app.synth();
