import path from 'node:path';
import fs from 'node:fs/promises';
import {resolve,writeJSON} from './common.mjs';
const dirs=await fs.readdir(resolve('.cache/browsers'));
const chromium=dirs.find(dir=>/^chromium-\d+$/.test(dir));
if(!chromium)throw new Error('Install Playwright Chromium in .cache/browsers first');
await fs.mkdir(resolve('output/playwright'),{recursive:true});
await writeJSON(resolve('output/playwright/cli.config.json'),{
  browser:{browserName:'chromium',userDataDir:resolve('.cache/browser-profile'),launchOptions:{
    executablePath:path.join(resolve('.cache/browsers'),chromium,'chrome-win64/chrome.exe'),
    headless:true,ignoreDefaultArgs:['--disable-extensions'],
    args:[`--disable-extensions-except=${resolve('dist/cleanweb')}`,`--load-extension=${resolve('dist/cleanweb')}`]
  },contextOptions:{viewport:{width:1440,height:1000}}},
  timeouts:{navigation:25000,action:5000},outputDir:resolve('output/playwright')
});
console.log(resolve('output/playwright/cli.config.json'));
