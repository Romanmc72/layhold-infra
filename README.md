# Layhold Infrastructure

This is the backend infrastructure on GCP for the Layhold app. It will create and deploy all of the services required for the server, database, and compute that runs the code for the app.

## Pre-requisites

There are a few things that one needs to create/do/install


### GCP Specific

- You must be logged into the gcloud application default credentials.
    - `gcloud auth application-default login`
- The environments must exist which are created by hand via the GCP console.
- You must create a bucket at least once otherwise the default cloud storage service account will not exist.
    - This can be achieved via the CLI using `gsutil mb "gs://${PROJECT_ID}-temp" && gsutil rb "gs://${PROJECT_ID}-temp"` which will create then delete the bucket in question.

### Software to install

#### NPM packages

This assumes you have [nodejs](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs) and npm installed (npm comes with node) and available. Once in this repo just run `npm install` and the tools should be installed for development.

#### CDKTF

After those GCP-specific pre-requisites are done and node is set up, you will also need the [terraform cloud development kit](https://developer.hashicorp.com/terraform/tutorials/cdktf/cdktf-install) to be installed.

### Environment Variables

To get started developing in your own personal GCP project from scratch, you will need to have the following environment variables to be set:

```
export LAYHOLD_DEV_PROJECT_ID='<The unique GCP project identifier>'
export LAYHOLD_DEV_PROJECT_NAME='<The name of the project (not necessarily unique)>'
export LAYHOLD_DEV_PROJECT_NUMBER='<The unique project number>'
export LAYHOLD_DEV_PROJECT_REGION='<The GCP region (aka location) to use (e.g. "us-central1")>'
export LAYHOLD_DEV_PROJECT_ZONE='<The GCP zone within the location/region (e.g. "us-central1-a")>'
```

You will also need to be authenticated to that project and have admin privileges on pretty much everything.

## The Cloud Run Service

The cloud run container cannot be deployed until at least one version of the container exists inside of the registry. This might require deploying the registry stack and its dependencies first, then pushing a container image to that repo using the desired name for the app and the tag `latest`.

## Deploying

Always log in first. You will need to log into the correct email that has access to the GCP project in question. That can be accomplished with:

```
# Logs into GCP
gcloud auth application-default login
```

After which you will need to make sure that docker is pointing to the correct artifact registry region. The regions in this app are currently `us-central1` but if you use a different region feel free to swap out the region in the following command.

```
# Authorizes Docker
GCP_REGION=us-central1
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev"
```

This can all then be deployed (at least to the dev account) via the following command:

```
cdktf deploy --auto-approve '*-dev*'
```

### On Initial deployment

The first time you deploy a new environment, you will need to deploy the terraform state stack and save its state to the git repo here. The state stack simply creates and manages the state bucket which will serve as the backend for the rest of the application's infrastructure as code. The state stack should essentially never change, or if it does that change needs to be coordinated with all developers who are using the code here.

To deploy the state stack use this command to deploy just the development stack:

```
# This will deploy just for development,
# to deploy all state stacks use `cdktf deploy 'terraform-state-*'`
# You will need to be logged into the account you are trying
# to deploy to though, so maybe to 1 at a time.
cdktf deploy terraform-state-dev-us-central1
```

Then add and commit the resulting generated state files to version control.

## The rest of the time after initial deployment

After initial deployment, use this command to redeploy all the stacks for the "dev" environment. Swap out "dev" with "prod" or any other valid environment name you have configured, and make sure you log in for that account too.

```
cdktf deploy '*-dev-*'
```

and add the `--auto-approve` flag if you don't want to check the deployment plan and just want to deploy it #YOLO.

## Locks

If you are facing issues with the lock files from terraform that are not released because of a failed deployment, you will need to force unlock them. To find all of the locked stacks you will need to run:

```
# Switch out the project id depending on which environment is being deployed
PROJECT_ID=<your-gcp-project-id>
gsutil ls -r "gs://${PROJECT_ID}-terraform-backend/" | grep lock
```

After that you will need to move to the directory for each locked stack and run:

```
cd cdktf.out/stacks/<STACK-NAME>
terraform apply
```

which will print out what the lock id is. (From what I understand you cannot get that lock id from the lockfile directly) After you get the lock id, you can then run this from that same directory:

```
terraform force-unlock <LOCK-ID>
```

and the stack will unlock.
