import * as requestLib from 'needle';
import * as path from 'path';

const isEmpty = require('lodash.isempty');
import { createSandbox } from 'sinon';

const sinon = createSandbox();

import * as cli from '../src/cli/commands';
import subProcess = require('../src/lib/sub-process');
import { fakeServer } from './acceptance/fake-server';

describe('monitor target', () => {
  const apiKey = '123456789';

  const port = (process.env.PORT = process.env.SNYK_PORT = '12345');
  const BASE_API = '/api/v1';
  process.env.SNYK_API = 'http://localhost:' + port + BASE_API;
  process.env.SNYK_HOST = 'http://localhost:' + port;
  process.env.LOG_LEVEL = '0';
  let oldKey;
  let oldEndpoint;
  const server = fakeServer(BASE_API, apiKey);

  beforeAll(async () => {
    let key = await cli.config('get', 'api');
    oldKey = key;

    key = await cli.config('get', 'endpoint');
    oldEndpoint = key;

    await server.listen(port);
  });

  afterAll(async () => {
    delete process.env.SNYK_API;
    delete process.env.SNYK_HOST;
    delete process.env.SNYK_PORT;

    await server.close();

    let key = 'set';
    let value = 'api=' + oldKey;
    if (!oldKey) {
      key = 'unset';
      value = 'api';
    }
    await cli.config(key, value);
    if (oldEndpoint) {
      await cli.config('endpoint', oldEndpoint);
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  it('Make sure that target is sent correctly', async () => {
    const subProcessStub = sinon.stub(subProcess, 'execute');
    const requestSpy = sinon.spy(requestLib, 'request');

    subProcessStub
      .withArgs('git', ['remote', 'get-url', 'origin'])
      .resolves('http://github.com/snyk/project.git');

    subProcessStub
      .withArgs('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
      .resolves('master');

    const { data } = await getFakeServerRequestBody(server);
    expect(requestSpy.calledTwice).toBeTruthy();
    expect(!isEmpty(data.target)).toBeTruthy();
    expect(!isEmpty(data.targetFileRelativePath)).toBeTruthy();
    expect(data.target.branch).toEqual('master');
    expect(data.target.remoteUrl).toEqual('http://github.com/snyk/project.git');
    expect(data.targetFileRelativePath).toMatch(
      'yarn-package' + path.sep + 'yarn.lock',
    );

    subProcessStub.restore();
    requestSpy.restore();
  }, 10000);

  it("Make sure it's not failing monitor for non git projects", async () => {
    const subProcessStub = sinon.stub(subProcess, 'execute');
    const requestSpy = sinon.spy(requestLib, 'request');
    const { data } = await getFakeServerRequestBody(server);

    expect(requestSpy.calledTwice).toBeTruthy();
    expect(isEmpty(data.target)).toBeTruthy();
    expect(data.targetFileRelativePath).toMatch(
      'yarn-package' + path.sep + 'yarn.lock',
    );

    subProcessStub.restore();
    requestSpy.restore();
  }, 10000);

  it("Make sure it's not failing if there is no remote configured", async () => {
    const subProcessStub = sinon.stub(subProcess, 'execute');
    const requestSpy = sinon.spy(requestLib, 'request');
    const { data } = await getFakeServerRequestBody(server);

    expect(requestSpy.calledTwice).toBeTruthy();
    expect(isEmpty(data.target)).toBeTruthy();
    expect(data.targetFileRelativePath).toMatch(
      'yarn-package' + path.sep + 'yarn.lock',
    );
    subProcessStub.restore();
    requestSpy.restore();
  }, 10000);
});

async function getFakeServerRequestBody(server) {
  const dir = path.join(__dirname, '/acceptance', 'workspaces');
  process.chdir(dir);
  await cli.monitor('yarn-package');
  const req = server.popRequest();
  const body = req.body;

  return {
    data: body,
  };
}
