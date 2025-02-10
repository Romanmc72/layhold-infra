import {App} from 'cdktf';
import {ENVIRONMENTS, deployEnvironment} from './lib/config';

const APP = new App();

const imageTag = process.env.imageTag ? process.env.imageTag : '1881360';

ENVIRONMENTS.forEach(
    (environment) => deployEnvironment(APP, environment, imageTag),
);

APP.synth();
