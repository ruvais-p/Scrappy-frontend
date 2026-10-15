import {test,expect} from '@playwright/test';
import {signIn} from './helpers';

test('queued PDF exposes download only after the worker finishes',async({page})=>{
 const bill='11111111-1111-4111-8111-111111111111',job='22222222-2222-4222-8222-222222222222';let state='pending';
 await page.route('**/api/v1/pickups/?*',route=>route.fulfill({json:{count:1,page:1,page_size:50,results:[{id:bill,number:'TEST-PDF-1',customer_name:'Synthetic household',total:'100',settled:'0',state:'issued',version:1}]}}));
 await page.route(`**/api/v1/documents/${bill}/pdf-jobs/`,route=>route.fulfill({status:202,json:{id:job,state:'pending',error:''}}));
 await page.route(`**/api/v1/jobs/${job}/`,route=>route.fulfill({json:{id:job,state,error:''}}));
 await signIn(page,'hq_manager');
 await page.locator('nav').getByRole('button',{name:'Pickups and bills',exact:true}).click();
 await page.getByRole('button',{name:'TEST-PDF-1',exact:true}).click();
 await page.getByRole('button',{name:'Prepare downloadable PDF',exact:true}).click();
 await expect(page.getByText('PDF queued. Waiting for the document worker.')).toBeVisible();
 await expect(page.getByRole('link',{name:'Download prepared PDF'})).toHaveCount(0);
 state='done';
 await expect(page.getByRole('link',{name:'Download prepared PDF'})).toHaveAttribute('href',`/api/v1/jobs/${job}/download/`);
});
