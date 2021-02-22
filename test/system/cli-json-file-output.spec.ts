import { exec } from 'child_process';
import { sep, join } from 'path';
import { readFileSync, unlinkSync, rmdirSync, mkdirSync, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const osName = require('os-name');

const main = './dist/cli/index.js'.replace(/\//g, sep);
const isWindows =
  osName()
    .toLowerCase()
    .indexOf('windows') === 0;
describe('test --json-file-output ', () => {
  it('`can save JSON output to file while sending human readable output to stdout`', async () => {
    exec(
      `node ${main} test --json-file-output=snyk-direct-json-test-output.json`,
      async (err, stdout) => {
        if (err) {
          throw err;
        }
        // give file a little time to be finished to be written
        await new Promise((r) => setTimeout(r, 3000));
        expect(stdout).toMatch('Organization:');
        const outputFileContents = readFileSync(
          'snyk-direct-json-test-output.json',
          'utf-8',
        );
        unlinkSync('./snyk-direct-json-test-output.json');
        const jsonObj = JSON.parse(outputFileContents);
        const okValue = jsonObj.ok as boolean;
        expect(okValue).toBeTruthy();
      },
    );
  }, 1000);

  it('`test --json-file-output produces same JSON output as normal JSON output to stdout`', () => {
    exec(
      `node ${main} test --json --json-file-output=snyk-direct-json-test-output.json`,
      async (err, stdout) => {
        if (err) {
          throw err;
        }
        // give file a little time to be finished to be written
        await new Promise((r) => setTimeout(r, 1000));
        const stdoutJson = stdout;
        const outputFileContents = readFileSync(
          'snyk-direct-json-test-output.json',
          'utf-8',
        );
        unlinkSync('./snyk-direct-json-test-output.json');
        expect(stdoutJson).toEqual(outputFileContents);
      },
    );
  }, 2000);

  it('`test --json-file-output can handle a relative path`', () => {
    // if 'test-output' doesn't exist, created it
    if (!existsSync('test-output')) {
      mkdirSync('test-output');
    }

    const tempFolder = uuidv4();
    const outputPath = `test-output/${tempFolder}/snyk-direct-json-test-output.json`;

    exec(
      `node ${main} test --json --json-file-output=${outputPath}`,
      async (err, stdout) => {
        if (err) {
          throw err;
        }
        // give file a little time to be finished to be written
        await new Promise((r) => setTimeout(r, 500));
        const stdoutJson = stdout;
        const outputFileContents = readFileSync(outputPath, 'utf-8');
        unlinkSync(outputPath);
        rmdirSync(`test-output/${tempFolder}`);
        expect(stdoutJson).toEqual(outputFileContents);
      },
    );
  }, 1000);

  if (isWindows) {
    test('`test --json-file-output can handle an absolute path`', () => {
      // if 'test-output' doesn't exist, created it
      if (!existsSync('test-output')) {
        mkdirSync('test-output');
      }

      const tempFolder = uuidv4();
      const outputPath = join(
        process.cwd(),
        `test-output/${tempFolder}/snyk-direct-json-test-output.json`,
      );

      exec(
        `node ${main} test --json --json-file-output=${outputPath}`,
        async (err, stdout) => {
          if (err) {
            throw err;
          }
          // give file a little time to be finished to be written
          await new Promise((r) => setTimeout(r, 10000));
          const stdoutJson = stdout;
          const outputFileContents = readFileSync(outputPath, 'utf-8');
          unlinkSync(outputPath);
          rmdirSync(`test-output/${tempFolder}`);
          expect(stdoutJson).toEqual(outputFileContents);
        },
      );
    }, 20000);
  }
});
