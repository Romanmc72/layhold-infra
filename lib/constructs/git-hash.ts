import * as childProcess from 'child_process';

/**
 * Retrieves the current Git Commit hash value to use it within the program
 */
export const GIT_HASH = childProcess.execSync('git rev-parse --short HEAD')
    .toString()
    .trim();
