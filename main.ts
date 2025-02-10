import {App} from 'cdktf';
import {ENVIRONMENTS, deployEnvironment} from './lib/config';

const APP = new App();

ENVIRONMENTS.forEach((environment) => deployEnvironment(APP, environment));

APP.synth();
