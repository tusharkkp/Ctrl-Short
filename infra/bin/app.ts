/**
 * Purpose:
 * Entry point for AWS CDK deployment synthesizing the CtrlShortStack cloud infrastructure.
 */

import * as cdk from 'aws-cdk-lib';
import { CtrlShortStack } from '../lib/ctrl-short-stack';

const app = new cdk.App();

new CtrlShortStack(app, 'CtrlShortStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '548171706026',
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'ap-south-1',
  },
  description: 'Ctrl Short — Serverless URL Shortener & Analytics Platform Infrastructure',
});

app.synth();
