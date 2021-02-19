import protect from './lib';

async function main() {
  // const projectPath = path.resolve(__dirname, '.');
  const projectPath = __dirname;
  await protect(projectPath);
}

if (require.main === module) {
  main();
}
