import {test,expect} from '@playwright/test';
import {signIn} from './helpers';

test('collector revokes prepared customer links and sees confirmation',async({page})=>{
 const bill='11111111-1111-4111-8111-111111111111',lead='22222222-2222-4222-8222-222222222222';let revoked=false;
 await page.route('**/api/v1/pickups/?*',route=>route.fulfill({json:{count:1,page:1,page_size:50,results:[{id:bill,lead,number:'TEST-LINK-1',customer_name:'Synthetic household',total:'100',settled:'100',state:'completed',version:2}]}}));
 await page.route(`**/api/v1/leads/${lead}/`,route=>route.fulfill({json:{id:lead,phone:'9000000000',sent_at:'2026-10-15T10:00:00Z',agreed_at:'2026-10-15T10:01:00Z',version:2}}));
 await page.route(`**/api/v1/documents/${bill}/share/`,route=>route.fulfill({json:{url:'/api/v1/customer-bill/synthetic-token/'}}));
 await page.route(`**/api/v1/documents/${bill}/revoke-links/`,route=>{revoked=true;return route.fulfill({json:{revoked:1}});});
 await signIn(page,'collector');
 await page.locator('nav').getByRole('button',{name:'Pickups and bills',exact:true}).click();
 await page.getByRole('button',{name:'TEST-LINK-1',exact:true}).click();
 await page.getByRole('button',{name:'Prepare customer link',exact:true}).click();
 await expect(page.getByRole('link',{name:'Open WhatsApp'})).toBeVisible();
 await page.getByRole('button',{name:'Revoke customer links',exact:true}).click();
 await expect(page.getByText('Existing customer links revoked. Prepare a new link when needed.')).toBeVisible();
 await expect(page.getByRole('link',{name:'Open WhatsApp'})).toHaveCount(0);
 expect(revoked).toBe(true);
});
