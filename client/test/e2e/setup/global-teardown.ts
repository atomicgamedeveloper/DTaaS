import MCR from 'monocart-coverage-reports';
import coverageOptions from 'test/e2e/setup/mcr.config';

async function globalTeardown() {
  const mcr = MCR(coverageOptions);
  await mcr.generate();
}

export default globalTeardown;
