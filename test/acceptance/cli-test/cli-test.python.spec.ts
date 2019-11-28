import * as fs from 'fs';
import * as sinon from 'sinon';
import { AcceptanceTests } from './cli-test.acceptance.test';

function loadJson(filename: string) {
  return JSON.parse(fs.readFileSync(filename, 'utf-8'));
}

export const PythonTests: AcceptanceTests = {
  language: 'Python',
  tests: {
    '`test pip-app --file=requirements.txt`': (params, utils) => async (t) => {
      utils.chdirWorkspaces();
      const plugin = {
        async inspect() {
          return {
            package: {},
            plugin: { name: 'testplugin', runtime: 'testruntime' },
          };
        },
      };
      const spyPlugin = sinon.spy(plugin, 'inspect');

      const loadPlugin = sinon.stub(params.plugins, 'loadPlugin');
      t.teardown(loadPlugin.restore);
      loadPlugin.withArgs('pip').returns(plugin);

      await params.cli.test('pip-app', {
        file: 'requirements.txt',
      });
      let req = params.server.popRequest();
      t.equal(req.method, 'GET', 'makes GET request');
      t.match(
        req.url,
        'cli-config/feature-flags/pythonPinningAdvice',
        'to correct url',
      );
      req = params.server.popRequest();
      t.equal(req.method, 'POST', 'makes POST request');
      t.equal(
        req.headers['x-snyk-cli-version'],
        params.versionNumber,
        'sends version number',
      );
      t.match(req.url, '/test-dep-graph', 'posts to correct url');
      t.equal(req.body.depGraph.pkgManager.name, 'pip');
      t.same(
        spyPlugin.getCall(0).args,
        [
          'pip-app',
          'requirements.txt',
          {
            args: null,
            file: 'requirements.txt',
            org: null,
            projectName: null,
            packageManager: 'pip',
            path: 'pip-app',
            showVulnPaths: 'some',
          },
        ],
        'calls python plugin',
      );
    },

    '`test pipenv-app --file=Pipfile`': (params, utils) => async (t) => {
      utils.chdirWorkspaces();
      const plugin = {
        async inspect() {
          return {
            plugin: {
              targetFile: 'Pipfile',
              name: 'snyk-python-plugin',
              runtime: 'Python',
            },
            package: {},
          };
        },
      };
      const spyPlugin = sinon.spy(plugin, 'inspect');

      const loadPlugin = sinon.stub(params.plugins, 'loadPlugin');
      t.teardown(loadPlugin.restore);
      loadPlugin.withArgs('pip').returns(plugin);

      await params.cli.test('pipenv-app', {
        file: 'Pipfile',
      });
      let req = params.server.popRequest();
      t.equal(req.method, 'GET', 'makes GET request');
      t.match(
        req.url,
        'cli-config/feature-flags/pythonPinningAdvice',
        'to correct url',
      );
      req = params.server.popRequest();
      t.equal(req.method, 'POST', 'makes POST request');
      t.equal(
        req.headers['x-snyk-cli-version'],
        params.versionNumber,
        'sends version number',
      );
      t.match(req.url, '/test-dep-graph', 'posts to correct url');
      t.equal(req.body.targetFile, 'Pipfile', 'specifies target');
      t.equal(req.body.depGraph.pkgManager.name, 'pip');
      t.same(
        spyPlugin.getCall(0).args,
        [
          'pipenv-app',
          'Pipfile',
          {
            args: null,
            file: 'Pipfile',
            org: null,
            projectName: null,
            packageManager: 'pip',
            path: 'pipenv-app',
            showVulnPaths: 'some',
          },
        ],
        'calls python plugin',
      );
    },

    '`test pip-app-transitive-vuln --file=requirements.txt (actionableCliRemediation=false)`': (
      params,
      utils,
    ) => async (t) => {
      utils.chdirWorkspaces();
      const plugin = {
        async inspect() {
          return loadJson('./pip-app-transitive-vuln/inspect-result.json');
        },
      };
      const spyPlugin = sinon.spy(plugin, 'inspect');

      const loadPlugin = sinon.stub(params.plugins, 'loadPlugin');
      t.teardown(loadPlugin.restore);
      loadPlugin.withArgs('pip').returns(plugin);

      params.server.setNextResponse(
        loadJson('./pip-app-transitive-vuln/response-without-remediation.json'),
      );
      try {
        await params.cli.test('pip-app-transitive-vuln', {
          file: 'requirements.txt',
        });
        t.fail('should throw, since there are vulns');
      } catch (e) {
        t.equals(
          e.message,
          fs.readFileSync('pip-app-transitive-vuln/cli-output.txt', 'utf8'),
        );
      }
      let req = params.server.popRequest();
      t.equal(req.method, 'GET', 'makes GET request');
      t.match(
        req.url,
        'cli-config/feature-flags/pythonPinningAdvice',
        'to correct url',
      );
      req = params.server.popRequest();
      t.equal(req.method, 'POST', 'makes POST request');
      t.equal(
        req.headers['x-snyk-cli-version'],
        params.versionNumber,
        'sends version number',
      );
      t.match(req.url, '/test-dep-graph', 'posts to correct url');
      t.equal(req.body.depGraph.pkgManager.name, 'pip');
      t.same(
        spyPlugin.getCall(0).args,
        [
          'pip-app-transitive-vuln',
          'requirements.txt',
          {
            args: null,
            file: 'requirements.txt',
            org: null,
            projectName: null,
            packageManager: 'pip',
            path: 'pip-app-transitive-vuln',
            showVulnPaths: 'some',
          },
        ],
        'calls python plugin',
      );
    },

    '`test pip-app-transitive-vuln --file=requirements.txt (actionableCliRemediation=true)`': (
      params,
      utils,
    ) => async (t) => {
      utils.chdirWorkspaces();
      const plugin = {
        async inspect() {
          return loadJson('./pip-app-transitive-vuln/inspect-result.json');
        },
      };
      const spyPlugin = sinon.spy(plugin, 'inspect');

      const loadPlugin = sinon.stub(params.plugins, 'loadPlugin');
      t.teardown(loadPlugin.restore);
      loadPlugin.withArgs('pip').returns(plugin);

      params.server.setNextResponse(
        loadJson('./pip-app-transitive-vuln/response-with-remediation.json'),
      );
      try {
        await params.cli.test('pip-app-transitive-vuln', {
          file: 'requirements.txt',
        });
        t.fail('should throw, since there are vulns');
      } catch (e) {
        t.equals(
          e.message,
          fs.readFileSync(
            'pip-app-transitive-vuln/cli-output-actionable-remediation.txt',
            'utf8',
          ),
        );
      }
      let req = params.server.popRequest();
      t.equal(req.method, 'GET', 'makes GET request');
      t.match(
        req.url,
        'cli-config/feature-flags/pythonPinningAdvice',
        'to correct url',
      );
      req = params.server.popRequest();
      t.equal(req.method, 'POST', 'makes POST request');
      t.equal(
        req.headers['x-snyk-cli-version'],
        params.versionNumber,
        'sends version number',
      );
      t.match(req.url, '/test-dep-graph', 'posts to correct url');
      t.equal(req.body.depGraph.pkgManager.name, 'pip');
      t.same(
        spyPlugin.getCall(0).args,
        [
          'pip-app-transitive-vuln',
          'requirements.txt',
          {
            args: null,
            file: 'requirements.txt',
            org: null,
            projectName: null,
            packageManager: 'pip',
            path: 'pip-app-transitive-vuln',
            showVulnPaths: 'some',
          },
        ],
        'calls python plugin',
      );
    },
  },
};