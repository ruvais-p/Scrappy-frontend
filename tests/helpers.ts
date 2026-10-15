import {expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const password = process.env.SCRAPPY_DEMO_PASSWORD || readFileSync('../backend/.env','utf8').split('\n').find(l=>l.startsWith('SCRAPPY_DEMO_PASSWORD='))?.split('=').slice(1).join('=');
export async function signIn(page: import('@playwright/test').Page, role:string){
  if(!password) throw new Error('Seed synthetic accounts and configure SCRAPPY_DEMO_PASSWORD.');
  await page.goto('/');
  await page.getByLabel('Email address').fill(role+'@example.test');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  // Avoid persisting credentials in failure accessibility snapshots.
  await page.locator('input[type="password"]').evaluateAll(inputs=>inputs.forEach(input=>{(input as HTMLInputElement).value='';}));
  await expect(page.getByRole('heading',{name:/Hello,/})).toBeVisible();
  await expect(page.locator('.connection')).toHaveText('Live');
  await expect(page.locator('body')).toHaveCSS('font-family',/Poppins/);
  await expect(page.getByText('Your daily workspace',{exact:true})).toBeVisible();
  await page.screenshot({path:`test-results/${role}-workspace.png`,fullPage:true});
}
