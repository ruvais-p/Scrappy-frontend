import {test, expect} from '@playwright/test';
import {signIn} from './helpers';

test('HQ inventory distinguishes current stock and reporting period',async({page})=>{
 await signIn(page,'hq_manager');
 await page.locator('nav').getByRole('button',{name:'Inventory',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Stock and movement history'})).toBeVisible();
 await expect(page.getByRole('columnheader',{name:'Period closing',exact:true})).toBeVisible();
 await expect(page.getByRole('columnheader',{name:'Current stock',exact:true})).toBeVisible();
 await page.getByLabel('From',{exact:true}).fill('2020-01-01');
 await page.getByLabel('To',{exact:true}).fill('2020-01-31');
 await expect(page.getByText(/Period: 2020-01-01 to 2020-01-31/)).toBeVisible();
 await expect(page.getByRole('heading',{name:'Flagged receipts',exact:true})).toBeVisible();
 await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});
