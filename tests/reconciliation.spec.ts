import {test, expect, Page} from '@playwright/test';
import {signIn} from './helpers';

// UI resilience uses explicit synthetic responses. Database posting and scope are
// tested against PostgreSQL in backend/tests/test_reconciliation.py.
const lead = '11111111-1111-4111-8111-111111111111';
const iron = '22222222-2222-4222-8222-222222222222';
const paper = '33333333-3333-4333-8333-333333333333';
type Line = {product:string;actual:string};
function compared(lines:Line[]) {
  return lines.map(line => ({...line,name:line.product===iron?'Iron':'Paper',billed:line.product===iron?'10':'0',difference:String(Number(line.actual)-(line.product===iron?10:0)),percent:line.product===iron?String((Number(line.actual)-10)*10):null,flagged:true,check:line.product===iron?'Short':'Unbilled excess'}));
}
async function setup(page:Page, failOnce=false) {
  const state={version:1,receipt:null as null | Record<string,unknown>,submitted:false,attempts:[] as {key:string|undefined;body:unknown}[]};
  await page.route('**/api/v1/reconciliation-queue/**',route=>route.fulfill({json:{count:state.submitted?0:1,page:1,page_size:50,results:state.submitted?[]:[{id:lead,customer_name:'Reconciliation test household',driver_name:'Test Collector',warehouse_name:'North Yard Warehouse',pickup_date:'2026-10-15',state:state.receipt?'draft':'awaiting_measurement',version:state.version}]}}));
  await page.route('**/api/v1/receipts/?*',route=>route.fulfill({json:{count:0,page:1,page_size:50,results:[]}}));
  await page.route(`**/api/v1/reconciliation/${lead}/`,async route=>{
    if(route.request().method()==='POST'){
      const body=route.request().postDataJSON();const lines=compared(body.lines);
      await route.fulfill({json:{version:state.version,lines,complete:lines.some(line=>line.product===iron),billed_total:'10',actual_total:String(lines.reduce((sum,line)=>sum+Number(line.actual),0))}});
    }else await route.fulfill({json:{lead,version:state.version,can_edit:!state.submitted,unavailable_reason:'',lines:[{product:iron,name:'Iron',billed:'10',unit:'kg'}],materials:[{id:iron,name:'Iron'},{id:paper,name:'Paper'}],receipt:state.receipt}});
  });
  await page.route(`**/api/v1/leads/${lead}/*/`,async route=>{
    const body=route.request().postDataJSON();state.attempts.push({key:route.request().headers()['idempotency-key'],body});
    if(failOnce&&state.attempts.length===1){await route.fulfill({status:503,json:{error:{detail:'Synthetic interrupted response'}}});return;}
    state.version++;state.submitted=route.request().url().includes('/receive/');
    state.receipt={id:'44444444-4444-4444-8444-444444444444',lines:compared(body.lines),note:body.note,state:state.submitted?'submitted':'draft',lead_version:state.version};
    await route.fulfill({json:state.receipt});
  });
  await signIn(page,'warehouse_manager');
  await page.locator('nav').getByRole('button',{name:'Reconcile loads',exact:true}).click();
  await page.getByRole('button',{name:'Enter measurements',exact:true}).click();
  await expect(page.getByLabel('Measured Iron kg')).toBeVisible();
  return state;
}

test('warehouse saves zero and unbilled material, resumes and submits reviewed draft',async({page})=>{
  const state=await setup(page);
  await page.getByLabel('Measured Iron kg').fill('0');
  await page.getByRole('combobox',{name:'Unbilled material',exact:true}).selectOption(paper);
  await page.getByRole('button',{name:'Add unbilled material',exact:true}).click();
  await page.getByLabel('Measured Paper kg').fill('3');
  await page.getByLabel('Warehouse note').fill('Measured explicitly; iron absent.');
  await page.getByRole('button',{name:'Review measurements',exact:true}).click();
  await expect(page.getByText('Unbilled excess',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.getByText('Draft saved. Inventory has not changed.')).toBeVisible();
  expect(state.submitted).toBe(false);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Resume measurements',exact:true}).click();
  await expect(page.getByLabel('Measured Iron kg')).toHaveValue('0');
  await expect(page.getByLabel('Measured Paper kg')).toHaveValue('3');
  await page.getByRole('button',{name:'Review measurements',exact:true}).click();
  await page.getByRole('button',{name:'Submit reconciliation',exact:true}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(state.submitted).toBe(true);
});

test('unknown save freezes input and recovers with identical retry key',async({page})=>{
  const state=await setup(page,true);
  await page.getByLabel('Measured Iron kg').fill('9');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.getByText(/save result is unknown/)).toBeVisible();
  await expect(page.getByLabel('Measured Iron kg')).toBeDisabled();
  await expect(page.getByRole('button',{name:'Close dialog',exact:true})).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'Recover save result',exact:true}).click();
  await expect(page.getByText('Draft saved. Inventory has not changed.')).toBeVisible();
  expect(state.attempts).toHaveLength(2);expect(state.attempts[0]).toEqual(state.attempts[1]);
});

test('remote changes preserve dirty measurements until explicit reload',async({page})=>{
  const state=await setup(page);
  await page.getByLabel('Measured Iron kg').fill('9');
  state.version=2;state.receipt={id:'draft',lines:compared([{product:iron,actual:'7'}]),note:'Other operator',state:'draft',lead_version:2};
  await page.getByRole('button',{name:'Check for updates',exact:true}).click();
  await expect(page.getByText(/record changed while you were editing/)).toBeVisible();
  await expect(page.getByLabel('Measured Iron kg')).toHaveValue('9');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Reload saved measurements (discards edits)',exact:true}).click();
  await expect(page.getByLabel('Measured Iron kg')).toHaveValue('7');
});
