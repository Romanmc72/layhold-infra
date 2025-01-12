import 'cdktf/lib/testing/adapters/jest';
import {Testing} from 'cdktf';
import {CloudRunService} from '@cdktf/provider-google/lib/cloud-run-service';
import {DEV_ENVIRONMENT, deployEnvironment} from '../lib';

describe('My CDKTF Application', () => {
  it('Deploying environment should have everything', () => {
    expect(Testing.synthScope(() => {
      deployEnvironment(Testing.app(), DEV_ENVIRONMENT);
    })).toHaveResource(CloudRunService);
  });
});
