import {test,expect} from '@playwright/test';
import {signIn} from './helpers';
test('HQ login, scoped records, and logout',async({page})=>{
  await signIn(page,'hq_manager');
  await expect(page.locator('nav')).not.toContainText('Settings');
  await page.locator('nav').getByRole('button',{name:'Leads',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Leads',exact:true})).toBeVisible();
  await expect(page.getByText('Sample Household One',{exact:true}).first()).toBeVisible();
  await page.getByRole('combobox',{name:'Franchise',exact:true}).selectOption({label:'North Yard'});
  await page.reload();
  await expect(page.getByRole('combobox',{name:'Franchise',exact:true}).locator('option:checked')).toHaveText('North Yard');
  await page.getByRole('button',{name:'Sign out'}).click();
  await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
  expect((await page.request.get('/api/v1/leads/')).status()).toBe(403);
});
test('collector mobile navigation and restricted workspace',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await signIn(page,'collector');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Open navigation'}).click();
  await expect(page.locator('nav')).not.toContainText('Settings');
  await expect(page.locator('nav')).not.toContainText('Transactions');
  await page.locator('nav').getByRole('button',{name:'Leads',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Leads',exact:true})).toBeVisible();
  expect((await page.request.get('/api/v1/bills/')).status()).toBe(403);
});
